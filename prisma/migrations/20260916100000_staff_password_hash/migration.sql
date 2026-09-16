-- Password sign-in for staff whose email address Google can't serve.
-- Nullable on purpose: existing staff stay Google-only, and the password
-- provider refuses any account whose hash is null.
ALTER TABLE "Staff" ADD COLUMN "passwordHash" TEXT;
