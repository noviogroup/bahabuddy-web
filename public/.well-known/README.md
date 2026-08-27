# Deep-Link Verification Files (`.well-known/`)

These two files make iOS Universal Links and Android App Links **verify** for
shared-trip (`/trip/...`) and invitation (`/invite/...`) URLs. Without them,
tapping a Baha Buddy link opens the browser instead of the app, which breaks the
Phase 4 sharing/growth loop.

The native apps already declare these domains:
- iOS: `ios/Runner/Runner.entitlements` → `applinks:bahabuddy.com`, `applinks:bahabuddy.app`
- Android: `android/app/src/main/AndroidManifest.xml` → `https://bahabuddy.com/trip|/invite`, `https://bahabuddy.app/...`

## Canonical domain decision

**`bahabuddy.com` is canonical** (it is the declared product/marketing domain in
the root `AGENTS.md` and is where this web app deploys). `bahabuddy.app` is kept
as an alias. For verification to succeed, **every domain listed in the native
config must serve these two files**. So host this exact `.well-known/` folder on
BOTH `bahabuddy.com` and `bahabuddy.app` (and their `www.` hosts), or remove the
unused domain from the native config before release.

## What is already correct (do not change)

- `apple-app-site-association` is **complete** — it uses the real Apple Team ID
  (`892E645PUM`) and bundle id (`com.novio.bahabuddy.bahaBuddyV2`).

## The ONE value you must fill in

- `assetlinks.json` → `sha256_cert_fingerprints` currently contains
  `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT`.
  Replace it with the **Play App Signing** SHA-256 fingerprint from:
  Google Play Console → your app → **Test and release → Setup → App integrity →
  App signing key certificate → SHA-256 certificate fingerprint**.
  (Use the *App signing* key fingerprint, not the upload key, because Google
  re-signs the shipped artifact.)

  For local/internal testing before Play upload, you can temporarily add the
  fingerprint of your debug or upload keystore:
  `keytool -list -v -keystore <keystore> -alias <alias> | grep SHA256`.
  Multiple fingerprints are allowed in the array.

## Serving requirements (Netlify)

- `apple-app-site-association` has **no file extension** and **must** be served
  with `Content-Type: application/json`. A header rule for this path has been
  added to `bahabuddy-web/netlify.toml`.
- Both files must be reachable at the site root over HTTPS with **no redirect**:
  - `https://bahabuddy.com/.well-known/apple-app-site-association`
  - `https://bahabuddy.com/.well-known/assetlinks.json`

## Verify after deploy

- iOS:    `curl -I https://bahabuddy.com/.well-known/apple-app-site-association`
          → expect `200` + `content-type: application/json`, no redirect.
          Then Apple's CDN: `https://app-site-association.cdn-apple.com/a/v1/bahabuddy.com`
- Android: paste the domain into Google's tester:
          `https://developers.google.com/digital-asset-links/tools/generator`
          or `curl https://bahabuddy.com/.well-known/assetlinks.json`
- On-device: cold-install the release build, tap a real `/trip/<code>` link from
  Messages/Notes — it should open the app, not Safari/Chrome.

## Notes

- iOS strips associated-domain caching aggressively; AASA changes can take a
  fresh install (or a few minutes) to re-fetch.
- Android `autoVerify="true"` runs at install time; if the file is missing or the
  fingerprint is wrong at that moment, the link opens the browser until the next
  verification pass.
