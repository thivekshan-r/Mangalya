# Mangalya

Website for **Mangalya**, a shop in Sri Lanka selling photo frames, gift items, and Christian and Hindu ornaments, retail and wholesale. Customers browse the catalogue and order through WhatsApp; the shop manages products from an admin panel.

> Status: **customer site, wholesale enquiries and admin panel built.** Customers can browse, order on WhatsApp and ask for a wholesale quote; the shop can log in at `/admin` to manage products, photos, categories, enquiries, staff accounts and shop settings. Still to come: Tamil, and going live.

## Tech stack

| Part | Folder | Built with |
| --- | --- | --- |
| Website | `web/` | Next.js (React), TypeScript, Tailwind CSS |
| API | `api/` | Node.js, Express, TypeScript, Mongoose (MongoDB), Zod, JWT login in an httpOnly cookie |
| Checks | `.github/` | GitHub Actions: lint, type-check, tests and build on every push |

## Project structure

```
mangalya/
├── api/                    Express API
│   ├── src/
│   │   ├── app.ts          Builds the Express app (middleware + routes)
│   │   ├── server.ts       Connects to MongoDB and starts listening
│   │   ├── schemas.ts      Rules for incoming data (Zod)
│   │   ├── config/         Environment variables and database connection
│   │   ├── lib/            Login, slugs, product search, image uploads
│   │   ├── middleware/     Login checks and error handling
│   │   ├── models/         Product, category, user, settings, enquiry
│   │   ├── routes/         public.ts, auth.ts, admin.ts, health.ts
│   │   └── scripts/        seed.ts (first owner account and sample data)
│   └── tests/
│       ├── unit/           Fast tests, no database
│       └── api/            Full tests against a throwaway MongoDB
├── web/                    Next.js website
│   └── src/
│       ├── app/(shop)/     Customer pages: home, category, product, search, wholesale, about, contact
│       ├── app/admin/      Admin panel: login, products, categories, enquiries, settings, staff
│       ├── components/     Header, footer, product cards, order button; admin/ for the panel
│       ├── lib/            catalogue.ts (data), sample-data.ts, whatsapp.ts
│       └── assets/         Logo
└── .github/workflows/      CI checks
```

## Getting started

You need [Node.js](https://nodejs.org) 22 or newer and Git.

**1. Install packages**

```bash
npm install        # the helper that runs both apps together
npm run setup      # packages for api/ and web/
```

**2. Create your environment files**

```bash
cp api/.env.example api/.env
cp web/.env.example web/.env.local
```

On Windows Command Prompt use `copy` instead of `cp`.

The defaults work as they are. The API starts without a database in development, so `MONGODB_URI` can wait until you have set up MongoDB (see below).

**3. Run both apps**

```bash
npm run dev
```

- Website: http://localhost:3000
- API health check: http://localhost:4000/api/health

The website opens with the sample catalogue until you connect it to the API (see "Sample catalogue or real data").

Prefer two terminals? Run `npm run dev` inside `api/` in one and inside `web/` in the other.

## Sample catalogue or real data

The website decides where its data comes from by one setting in `web/.env.local`:

- **No `API_URL`:** it shows the sample catalogue in `web/src/lib/sample-data.ts`, with a yellow notice at the top of every page. Nothing else needs to be running. Add `WHATSAPP_NUMBER=9477XXXXXXX` to try the order buttons with your own number.
- **`API_URL=http://localhost:4000`:** it reads products, categories and shop settings from the API, which needs MongoDB connected and seeded (below).

Restart `npm run dev` after changing `.env.local`. The live site must always have `API_URL` set.

## Admin panel

Open http://localhost:3000/admin and log in with the owner account made by `npm run seed`. It needs the API and database running, and `API_URL` set in `web/.env.local`.

- **Products:** add, edit, hide, delete (restorable for 30 days) and restore. Changes show on the customer site straight away.
- **Photos:** need the three `CLOUDINARY_` values in `api/.env` (see "Image uploads"). Photos are made smaller in the browser before upload.
- **Categories:** add, rename, reorder, hide and delete. The order is the order of the website menu.
- **Enquiries:** wholesale requests from the website form, with buttons to reply on WhatsApp, call, and mark as replied or closed. The tab shows how many are waiting.
- **Shop settings:** WhatsApp number, Instagram page, address and opening hours. Owner only.
- **Staff:** the owner can add logins for shop staff, switch them off, set a new password or remove them. Staff can manage products, categories and enquiries only.
- **My account:** anyone logged in can change their own password.

The panel reaches the API through the website's own address (`/api/...`), which Next.js passes on. Open the site at the address listed in the API's `WEB_ORIGIN` (http://localhost:3000 in development), or logins and saves are refused.

## Connecting MongoDB

1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Add a database user, and allow your IP address under Network Access.
3. In `api/.env`, remove the `#` in front of `MONGODB_URI` and paste your connection string (Connect > Drivers), replacing the username and password, with `/mangalya` as the database name.
4. Restart the API. http://localhost:4000/api/health should now say `"database": "connected"`.

## Creating the owner account and sample data

1. In `api/.env`, fill in `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL` and `SEED_OWNER_PASSWORD` (10 characters or more).
2. From the `api/` folder run `npm run seed`.
3. Remove the `SEED_OWNER_PASSWORD` line from `api/.env`. The password is stored only as a hash in the database.

The seed adds the owner account, the four main categories, shop settings and three sample products tagged `sample`. It is safe to run again: it only adds what is missing. To change the owner's password later, set a new `SEED_OWNER_PASSWORD` and run `npm run seed -- --reset-password`.

## API reference

All addresses start with the API's address, `http://localhost:4000` in development. Errors come back as `{ "error": "message" }`, with `details.fields` when form fields are wrong.

**Public (no login)**

| Method | Address | What it does |
| --- | --- | --- |
| GET | `/api/health` | Is the API alive, and is the database connected |
| GET | `/api/products` | Live products. Query: `category`, `q`, `tag`, `featured`, `inStock`, `minPrice`, `maxPrice`, `sort` (`newest`, `price_asc`, `price_desc`, `name`), `page`, `limit` (max 48) |
| GET | `/api/products/:slug` | One product and up to four related ones |
| GET | `/api/categories` | Visible categories in menu order |
| GET | `/api/settings` | WhatsApp number, Instagram link, address, hours, banners |
| POST | `/api/enquiries` | The wholesale form: `{ name, phone, businessName?, town?, items?, message? }`. 5 per 10 minutes per address |

**Login**

| Method | Address | What it does |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }`. Sets the login cookie. 10 failed attempts per 15 minutes |
| POST | `/api/auth/logout` | Clears the login cookie |
| GET | `/api/auth/me` | Who is logged in |
| POST | `/api/auth/password` | `{ currentPassword, newPassword }`. Change your own password |

**Admin (login required; owner and staff unless noted)**

| Method | Address | What it does |
| --- | --- | --- |
| GET | `/api/admin/products` | All products. Same filters as the public list, plus `status` (`live`, `hidden`, `deleted`, `all`) |
| GET | `/api/admin/products/:id` | One product with admin fields |
| POST | `/api/admin/products` | Create. Only `name.en` and `category` are required; code and slug are generated |
| PATCH | `/api/admin/products/:id` | Change only the fields sent |
| DELETE | `/api/admin/products/:id` | Move to deleted (restorable for 30 days). `?permanent=true` removes for good, owner only |
| POST | `/api/admin/products/:id/restore` | Bring a deleted product back |
| GET | `/api/admin/categories` | All categories, hidden ones included |
| POST | `/api/admin/categories` | Create. Only `name.en` is required |
| PATCH | `/api/admin/categories/:id` | Change only the fields sent |
| DELETE | `/api/admin/categories/:id` | Refused while products or sub-categories use it |
| POST | `/api/admin/uploads` | Upload one image (form field `image`; JPEG, PNG or WebP up to 8 MB). Needs Cloudinary |
| PUT | `/api/admin/settings` | Change shop settings. Owner only |
| GET | `/api/admin/enquiries` | Enquiries, newest first. Query: `status` (`new`, `replied`, `closed`, `all`), `page` |
| PATCH | `/api/admin/enquiries/:id` | `{ status }` |
| DELETE | `/api/admin/enquiries/:id` | Owner only |
| GET | `/api/admin/users` | Staff and owner accounts. Owner only |
| POST | `/api/admin/users` | `{ name, email, password }`. Adds a staff account. Owner only |
| PATCH | `/api/admin/users/:id` | `{ name?, active?, password? }`. Staff accounts only. Owner only |
| DELETE | `/api/admin/users/:id` | Staff accounts only. Owner only |

## Image uploads

Product photos are stored on [Cloudinary](https://cloudinary.com). Create an account, copy the cloud name, API key and API secret from its dashboard into the three `CLOUDINARY_` lines of `api/.env`, and restart the API. Until then the upload endpoint answers that uploads are not set up.

## Tests

From the `api/` folder:

| Command | What it runs |
| --- | --- |
| `npm run test:unit` | Fast tests with no database: login tokens, input rules, search filters, model rules |
| `npm test` | Everything, including full tests of login, products, categories and settings |

The full tests start a real MongoDB in memory and throw it away afterwards, so they never touch your Atlas data. The first run downloads MongoDB (a few hundred MB) and can take a few minutes.

## Useful commands

Run these from the project root.

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API and the website together, restarting on changes |
| `npm run check` | Everything CI runs: lint, type-check, tests and a production build |
| `npm run check:api` | The API checks only |
| `npm run check:web` | The website checks only |

Inside `api/`: `npm test` runs the tests, `npm run build` then `npm start` runs the compiled API.

## Environment variables

Real `.env` files are never committed. The `.env.example` files list every variable with a description.

| App | Variable | Purpose |
| --- | --- | --- |
| API | `NODE_ENV` | `development` locally, `production` on the live server |
| API | `PORT` | Port the API listens on (default 4000) |
| API | `MONGODB_URI` | MongoDB connection string. Required in production |
| API | `WEB_ORIGIN` | Address of the website allowed to call the API |
| API | `JWT_SECRET` | Signs login cookies. Required in production, 32+ characters |
| API | `SESSION_DAYS` | How long a login lasts (default 7) |
| API | `SEED_OWNER_NAME`, `SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD` | Used once by `npm run seed` |
| API | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads |
| Web | `API_URL` | Address of the API. Leave unset to show the sample catalogue |
| Web | `WHATSAPP_NUMBER` | Shop number for the order buttons, sample catalogue only |
| Web | `SITE_URL` | The website's own address, used in shared links |

## Deploying

The website and the API are deployed separately from the same repository.

**API** (Render, Railway or similar)

- Root directory: `api`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, the three `CLOUDINARY_` values, and `WEB_ORIGIN` set to the website's address
- In Atlas, allow connections from your host (Network Access)

**Website** (Vercel)

- Root directory: `web`
- Environment: `API_URL` set to the API's address

Step 1 is done when the live website shows the message from the live API.

## Roadmap

- [x] Step 1: Project setup
- [x] Step 2: Design
- [x] Step 3: API for catalogue and login
- [x] Step 4: Admin panel
- [x] Step 5: Customer site (on sample data; Step 4 comes after the database)
- [ ] Step 6: Wholesale (done) and Tamil
- [ ] Step 7: Launch
- [ ] Step 8: Portfolio polish
