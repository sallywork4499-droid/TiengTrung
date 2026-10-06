-- ============================================================
-- Verso tiếng Trung — database riêng trong cùng project Supabase
--
-- Mọi thứ nằm trong schema verso_zh, tách hẳn khỏi public nơi
-- app tiếng Anh và các app khác đang chạy. Tên bảng giữ nguyên nên
-- mã nguồn dùng chung, chỉ khác một biến môi trường.
--
-- SAU KHI CHẠY FILE NÀY còn một bước làm bằng tay:
-- vào Project Settings → API → Exposed schemas, thêm "verso_zh" rồi lưu.
-- Thiếu bước đó thì app tiếng Trung không đọc được dữ liệu.
--
-- Chỉ THÊM, không xoá hay đổi gì trong public. Chạy lại nhiều lần vẫn an toàn.
-- ============================================================

create schema if not exists verso_zh;
grant usage on schema verso_zh to anon, authenticated, service_role;
alter default privileges in schema verso_zh
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema verso_zh
  grant all on functions to anon, authenticated, service_role;

-- 1. HỒ SƠ NGƯỜI DÙNG -----------------------------------------
create table if not exists verso_zh.profiles (
  id uuid primary key references auth.users on delete cascade,
  total_points bigint not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  preferred_difficulty text not null default 'sentence'
    check (preferred_difficulty in ('phrase','sentence','paragraph')),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  daily_goal int not null default 10 check (daily_goal between 1 and 200),
  -- Những mức đang luyện; đoạn đang luyện thì nằm ở pages.is_default
  focus_levels text[] not null default array['phrase', 'sentence', 'paragraph'],
  -- Hai cột dưới dành cho các app khác trong cùng project hay đồng bộ email vào đây
  email text,
  updated_at timestamptz default now(),
  created_at timestamptz not null default now()
);

-- Tự tạo hồ sơ khi có user mới đăng ký
create or replace function verso_zh.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = verso_zh
as $$
begin
  insert into verso_zh.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_zh on auth.users;
create trigger on_auth_user_created_zh
  after insert on auth.users
  for each row execute function verso_zh.handle_new_user();

-- 2. TRANG BÀI -------------------------------------------------
create table if not exists verso_zh.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  image_en_url text,
  image_vi_url text,
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. CẶP CÂU VIỆT - ANH ----------------------------------------
create table if not exists verso_zh.cards (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references verso_zh.pages on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  vi_text text not null,
  en_text text not null,
  difficulty text not null check (difficulty in ('phrase','sentence','paragraph')),
  times_seen int not null default 0,
  times_correct int not null default 0,
  streak int not null default 0,
  next_due_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 4. LỊCH SỬ TỪNG LẦN TRẢ LỜI ----------------------------------
create table if not exists verso_zh.attempts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references verso_zh.cards on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  user_answer text not null,
  is_correct boolean not null,
  first_try boolean not null default true,
  points_earned int not null default 0,
  llm_feedback jsonb,
  created_at timestamptz not null default now()
);

-- 5. NHẬT KÝ THEO NGÀY -----------------------------------------
create table if not exists verso_zh.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  seconds_spent int not null default 0,
  cards_completed int not null default 0,
  app_opens int not null default 0,
  points_earned int not null default 0,
  unique (user_id, log_date)
);

-- 6. HUY HIỆU --------------------------------------------------
create table if not exists verso_zh.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  badge_key text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

-- INDEX --------------------------------------------------------
create index if not exists zh_cards_due_idx on verso_zh.cards (user_id, difficulty, next_due_at);
create index if not exists zh_cards_page_idx on verso_zh.cards (page_id);
create index if not exists zh_attempts_card_idx on verso_zh.attempts (card_id);
create index if not exists zh_daily_logs_idx on verso_zh.daily_logs (user_id, log_date desc);
create index if not exists zh_pages_user_idx on verso_zh.pages (user_id, created_at desc);

-- ROW LEVEL SECURITY -------------------------------------------
alter table verso_zh.profiles    enable row level security;
alter table verso_zh.pages       enable row level security;
alter table verso_zh.cards       enable row level security;
alter table verso_zh.attempts    enable row level security;
alter table verso_zh.daily_logs  enable row level security;
alter table verso_zh.badges      enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own pages" on pages;
create policy "own pages" on pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own cards" on cards;
create policy "own cards" on cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own attempts" on attempts;
create policy "own attempts" on attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own logs" on daily_logs;
create policy "own logs" on daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own badges" on badges;
create policy "own badges" on badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- HÀM GHI HOẠT ĐỘNG + TÍNH STREAK
-- Gọi từ API route. Gộp 1 lần ghi để tránh race condition.
-- ============================================================
create or replace function verso_zh.log_activity(
  p_seconds int default 0,
  p_cards int default 0,
  p_opens int default 0,
  p_points int default 0
)
returns verso_zh.profiles
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_tz text;
  v_today date;
  v_last date;
  v_streak int;
  v_row profiles;
begin
  if v_uid is null then
    raise exception 'chưa đăng nhập';
  end if;

  select timezone, last_active_date, current_streak
    into v_tz, v_last, v_streak
    from verso_zh.profiles where id = v_uid;

  v_today := (now() at time zone coalesce(v_tz, 'Asia/Ho_Chi_Minh'))::date;

  insert into verso_zh.daily_logs (user_id, log_date, seconds_spent, cards_completed, app_opens, points_earned)
  values (v_uid, v_today, p_seconds, p_cards, p_opens, p_points)
  on conflict (user_id, log_date) do update set
    seconds_spent   = verso_zh.daily_logs.seconds_spent   + excluded.seconds_spent,
    cards_completed = verso_zh.daily_logs.cards_completed + excluded.cards_completed,
    app_opens       = verso_zh.daily_logs.app_opens       + excluded.app_opens,
    points_earned   = verso_zh.daily_logs.points_earned   + excluded.points_earned;

  -- Streak chỉ nhích khi thực sự hoàn thành câu, không phải chỉ mở app
  if p_cards > 0 then
    if v_last is null then
      v_streak := 1;
    elsif v_last = v_today then
      v_streak := greatest(v_streak, 1);
    elsif v_last = v_today - 1 then
      v_streak := v_streak + 1;
    else
      v_streak := 1;
    end if;

    update verso_zh.profiles set
      total_points = total_points + p_points,
      current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak),
      last_active_date = v_today
    where id = v_uid
    returning * into v_row;
  else
    update verso_zh.profiles set total_points = total_points + p_points
    where id = v_uid
    returning * into v_row;
  end if;

  return v_row;
end;
$$;


-- Phiên âm pinyin của bản gốc, sinh sẵn lúc nạp để xem lại không tốn lượt gọi
alter table verso_zh.cards add column if not exists reading text;

-- Tài khoản tạo trước khi dựng schema này thì chưa có hồ sơ, điền bù cho đủ
insert into verso_zh.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

-- Quyền trên những bảng vừa tạo
grant all on all tables in schema verso_zh to anon, authenticated, service_role;
grant all on all functions in schema verso_zh to anon, authenticated, service_role;
grant all on all sequences in schema verso_zh to anon, authenticated, service_role;

-- Kiểm tra: cả bốn dòng phải ra CÓ
select 'schema verso_zh' as kiem_tra,
       case when exists (select 1 from information_schema.schemata where schema_name = 'verso_zh')
            then 'CÓ' else 'THIẾU' end as ket_qua
union all
select 'đủ 6 bảng',
       case when (select count(*) from information_schema.tables
                  where table_schema = 'verso_zh' and table_type = 'BASE TABLE') = 6
            then 'CÓ' else 'THIẾU' end
union all
select 'cột pinyin',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'verso_zh' and table_name = 'cards' and column_name = 'reading')
            then 'CÓ' else 'THIẾU' end
union all
select 'public không bị đụng',
       case when (select count(*) from information_schema.tables
                  where table_schema = 'public' and table_name in ('profiles','pages','cards')) = 3
            then 'CÓ' else 'THIẾU' end;
