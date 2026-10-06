-- ============================================================
-- Verso v3.0 — cập nhật cho app TIẾNG ANH đang chạy
--
-- Chỉ thêm một cột để dùng chung mã nguồn với bản tiếng Trung.
-- App tiếng Anh không dùng cột này, nhưng câu lệnh lấy câu có hỏi tới nó.
--
-- Chạy trong Supabase SQL Editor. Chỉ THÊM, chạy lại nhiều lần vẫn an toàn.
-- ============================================================

alter table public.cards add column if not exists reading text;

select 'cột reading trong public.cards' as kiem_tra,
       case when exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'cards' and column_name = 'reading'
       ) then 'CÓ' else 'THIẾU' end as ket_qua;
