# StackTribe OS

## Sending email from the dashboard

Invoices, payment reminders, receipts, change-request approvals, project updates,
proposals, contracts, onboarding checklists and meeting summaries are emailed
from the dashboard through the company mailbox over SMTP. Sent mail appears in
that mailbox's Sent folder and clients reply to it as normal. Every email is
recorded in the activity log and listed on the Emails page.

Add these to the server environment (Vercel project settings, or `.env` locally):

```
SMTP_HOST=smtp.gmail.com        # Google Workspace; Zoho Mail: smtp.zoho.in
SMTP_PORT=465                   # 465 = SSL, 587 = STARTTLS
SMTP_USER=info@stacktribe.dev
SMTP_PASS=                      # an app password for that mailbox
EMAIL_FROM_NAME=StackTribe      # optional
EMAIL_FROM=                     # optional, defaults to SMTP_USER
EMAIL_REPLY_TO=                 # optional, defaults to the sender
EMAIL_BCC=                      # optional copy of every email
```

For local testing without sending anything, set `EMAIL_OUTBOX_DIR=/some/folder`
instead: each email is written there as an `.eml` file (ignored in production).

Signatures and the bank/UPI details used in invoices are set on the Emails page.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
