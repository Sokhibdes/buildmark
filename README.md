# BuildMark CRM — Marketing Agentlik Boshqaruv Tizimi

Qurilish kompaniyalari bilan ishlovchi marketing agentliklar uchun maxsus yaratilgan platforma.

---

## Xususiyatlar

**Admin panel (siz va komandangiz uchun):**
- Dashboard — barcha mijozlar va vazifalar holati
- Mijozlar — to'liq boshqaruv, portal yaratish
- Kanban board — 7 bosqichli ish jarayoni (drag & drop)
- Kontentlar — status tracking va mijoz tasdiqi
- Kampaniyalar — target natijalarini kuzatish
- Komanda — xodimlar yuklanishi va vazifalar
- Hisobotlar — grafik va jadvallar

**Mijoz portali (mijozlar uchun):**
- Havolani ulashish orqali kirish (login kerak emas)
- Kontentlarni ko'rish va tasdiqlash / rad etish
- Kampaniya natijalarini kuzatish
- Oylik hisobotlarni o'qish
- Umumiy progress holati

---

## O'rnatish

### 1. Loyihani yuklab oling

```bash
cd buildmark-crm
npm install
```

### 2. Supabase sozlash

1. [supabase.com](https://supabase.com) ga kiring
2. Yangi project yarating
3. **SQL Editor** ga o'ting
4. `supabase/schema.sql` faylini nusxalab, joylashtiring va ishga tushiring

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

`.env.local` faylini oching va to'ldiring:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase dashboard → Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase dashboard → Settings → API → anon public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Settings → API → service_role key

### 4. Birinchi admin yaratish

Supabase Dashboard → Authentication → Users → Invite user

Keyin SQL Editor da:
```sql
INSERT INTO public.profiles (id, full_name, role)
VALUES ('supabase-auth-user-id-here', 'Ism Familiya', 'owner');
```

### 5. Ishga tushirish

```bash
npm run dev
```

`http://localhost:3000` da oching.

---

## Deploy (Vercel)

```bash
npm install -g vercel
vercel
```

Environment variables ni Vercel dashboard dan ham qo'shing.

---

## Mijoz portali ishlatish

1. Admin panel → Mijozlar → Mijozni tanlang
2. "Portal yoqish" tugmasini bosing
3. Hosil bo'lgan havolani mijozga yuboring
4. Mijoz havola orqali o'z sahifasini ko'ra oladi

---

## Loyiha tuzilmasi

```
src/
├── app/
│   ├── admin/              # Admin panel
│   │   ├── dashboard/      # Bosh sahifa
│   │   ├── clients/        # Mijozlar
│   │   │   ├── [id]/       # Mijoz detail
│   │   │   └── new/        # Yangi mijoz
│   │   ├── tasks/          # Kanban board
│   │   ├── content/        # Kontentlar
│   │   ├── campaigns/      # Kampaniyalar
│   │   ├── team/           # Komanda
│   │   └── reports/        # Hisobotlar
│   ├── client/
│   │   └── portal/         # Mijoz portali
│   └── login/              # Kirish sahifasi
├── lib/
│   ├── supabase/           # Supabase clientlar
│   └── queries.ts          # Barcha DB so'rovlari
├── types/
│   └── index.ts            # TypeScript turlari
└── middleware.ts            # Auth himoyasi
```

---

## Texnologiyalar

- **Next.js 14** — React framework (App Router)
- **Supabase** — PostgreSQL + Auth + Real-time
- **TypeScript** — Type safety
- **Recharts** — Grafiklar
- **Lucide React** — Ikonalar
- **CSS Modules** — Uslublar

---

## Keyingi bosqichlar (kengaytirish)

- [ ] Real-time bildirishnomalar (Supabase Realtime)
- [ ] Fayl yuklash (Supabase Storage — rasm, video)
- [ ] Kontent taqvimi (calendar view)
- [ ] Syomka jadvali sahifasi
- [ ] Mobil ilovasi (React Native / Expo)
- [ ] AI yordamida kontent g'oyalari
- [ ] Telegram bot bildirishnomalari
- [ ] PDF hisobot eksport
