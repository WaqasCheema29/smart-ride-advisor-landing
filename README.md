# Smart Ride Advisor website

The website is a Next.js App Router project pinned to **Next.js 15.5.22**.

## Routes

- `/` — landing page, fare calculator, support, privacy, and account deletion overview.
- `/delete-account` — Firebase email/password or Google sign-in, followed by explicit deletion confirmation.
- `/delete-guide` — terms, data summary, and deletion instructions.

## Run locally

```sh
npm install
Copy-Item .env.example .env.local
# Set NEXT_PUBLIC_FIREBASE_APP_ID to the Firebase Web app ID.
npm run dev
```

Open `http://localhost:3000`. For production, run `npm run build` and `npm start`.

## Firebase setup

Use the Firebase **Web app** configuration from Project settings in `.env.local`. The checked-in Android `google-services` config does not contain the Web app ID. Enable Email/Password and Google providers in Firebase Authentication, and add the deployed host to Authorized domains. The Google sign-in flow uses the same `google.com` provider and `prompt=select_account` parameter as the Android login screen.

Realtime Database rules must let a signed-in user read and delete only their own `/drivers/{uid}` and `/ride_calculations/{uid}` nodes. This site currently deletes those two paths, based on the paths used by the prior website. The Android app’s complete data schema and database rules still need review before claiming every app record is erased. Phone-only accounts can delete from the signed-in app or contact support; this website does not send SMS.

Never put an Admin SDK service-account private key in this project. Firebase client API keys and app IDs are public configuration, not admin credentials.

## Notes

The landing page keeps the original website content and styling, while its calculator behavior and deletion flow run as Next.js client components. The original HTML files remain at the project root as a reference during the migration.
