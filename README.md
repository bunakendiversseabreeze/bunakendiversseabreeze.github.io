# bunakendiversseabreeze.github.io
Static website for Bunaken Divers Seabreeze Resort

## Jekyll templating
Jekyll formatting is used to reduce repetition and create shareable blocks of HTML. Jekyll is a built-in feature of GitHub pages.

### Layouts 
A HTML page using Jekyll specifies a YAML block at the top that states the layout to use (from the `_layouts` folder) alongside other variables to be injected into the template HTML. 

These variables are called in the template with `page.variable_name`. `{{ content }}` is used to populate the content that is specified after the YAML block in the calling file (e.g. standard-bungalow.html).

For example, `standard-bungalow.html` specifies the price, tagline, and images to be used when the template in `_layouts/bungalow.html` is rendered.

Layer chaining is also used in the layouts. E.g., bungalow.html inherits from default.html

### Includes
The "includes" feature of Jekyll is also used for repeated HTML blocks (found in the `_includes` folder). 

For example, accommodation.html includes bungalows-grid.html, which is also included on the index.html homepage. This means the bungalow grid HTML only needs to be changed in one place.

## Booking form

`book.html` contains a booking request form. It doesn't book a room directly — it sends a request that the resort confirms manually by email. There's no server of our own involved; submissions go straight from the visitor's browser to a Google Apps Script Web App, which logs the request in a Google Sheet and sends the notification/confirmation emails.

### How a submission flows

1. The visitor fills in the form on `book.html` and hits submit.
2. Client-side JS in `book.html` runs validation first (required fields, valid email, check-in not in the past or within 1 day of today, check-out after check-in, guest count). If anything fails, the request never leaves the browser — errors are shown inline instead.
3. If a bot has filled in the hidden honeypot field, the script still reports success back to the page (so the bot doesn't learn to leave it blank) but silently drops the submission — no email, no sheet row.
4. The data is POSTed to the Apps Script Web App URL (`SCRIPT_URL` in `book.html`), sent as `Content-Type: text/plain` rather than `application/json`. This is deliberate: Apps Script Web Apps don't handle CORS preflight (`OPTIONS`) requests, and `text/plain` avoids triggering a preflight at all. **Don't change this to `application/json`** without also adding a `doOptions()` handler on the Apps Script side, or submissions will start failing with CORS errors.
5. The Apps Script backend (`Code.gs`, deployed separately — see below) re-validates everything server-side (never trust the client alone), then:
   - logs the booking as a new row in a "Bookings" Google Sheet,
   - emails the resort owner with the booking details,
   - emails the guest a confirmation that their *request* (not a confirmed booking) was received.
6. The page shows a success or error message based on the response. If the request never reaches the server at all (offline, timeout, blocked), the page shows a WhatsApp link as a fallback so the guest isn't left stuck.

### Keeping the two sides in sync

The frontend (`book.html`) and backend (`Code.gs`) are two separate files in two separate places (this repo, and a Google Apps Script project attached to a Google Sheet), so validation rules that exist on both sides need to be updated in both places if they change. For example, the maximum guest count is capped at 20 in both the `book.html` guest dropdown and the `GUEST_COUNT_MAX` constant in `Code.gs`.

### Deploying changes to the backend

`Code.gs` isn't part of this repo's build — it lives in a Google Apps Script project. If you edit it:

1. Open the Apps Script project attached to the booking Google Sheet.
2. Paste in the updated code.
3. Go to **Deploy > Manage deployments**, edit the existing deployment, and create a **new version**. Editing the script alone does *not* update the live, already-deployed URL's behaviour — you have to redeploy.
4. If the Web App URL ever changes, update `SCRIPT_URL` in `book.html`'s `<script>` block to match.

See the comment block at the top of `Code.gs` for full first-time setup instructions (creating the Sheet, setting `OWNER_EMAIL`, deployment settings).
