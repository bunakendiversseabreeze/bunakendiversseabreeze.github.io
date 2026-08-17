/**
 * Seabreeze Resort — Booking Request handler
 * ============================================
 *
 * SETUP:
 * 1. Create a new Google Sheet (this will hold your booking log).
 * 2. In that Sheet: Extensions > Apps Script. Delete any starter code and
 *    paste this file's contents in.
 * 3. Replace OWNER_EMAIL below with the real address that should receive
 *    booking notifications.
 * 4. Click Deploy > New deployment > select type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the Web App URL it gives you and paste it into SCRIPT_URL in
 *    book.html's <script> block.
 * 6. Every time you edit this script afterwards, you must create a NEW
 *    deployment (or "Manage deployments" > edit > new version) for the
 *    changes to actually go live — editing the code alone does not update
 *    the already-deployed URL's behaviour.
 *
 * CORS NOTE:
 * The form on book.html sends its request with Content-Type: text/plain
 * rather than application/json. This is deliberate — browsers only send a
 * CORS "preflight" (an OPTIONS request) for certain content types, and Apps
 * Script Web Apps don't handle preflight requests. Sending as text/plain
 * avoids triggering the preflight in the first place, so the POST goes
 * straight through and Apps Script's own response (which includes an
 * open CORS header automatically for actual GET/POST requests) can be read
 * by the page. Do not change the frontend to send application/json without
 * also handling doOptions() here, or submissions will start failing with a
 * CORS error even though the emails would technically have sent.
 */

var OWNER_EMAIL = 'oisinbrennan@gmail.com'; // TODO: replace with your real address
var SHEET_NAME = 'Seabreeze Booking Requests Test';
var GUEST_COUNT_MAX = 20;

function doPost(e) {
  var lock = LockService.getScriptLock();
  var gotLock = lock.tryLock(10000);

  try {
    var data = parseRequest_(e);
    if (!data) {
      return respond_({ result: 'error', message: 'Could not read submission.' });
    }

    // Honeypot: real visitors never see or fill this field. If it's
    // populated, silently report success without sending mail or logging —
    // so automated spam doesn't learn which field to leave blank.
    if (data.company) {
      return respond_({ result: 'success' });
    }

    var errors = validate_(data);
    if (errors.length) {
      return respond_({ result: 'error', message: errors.join(' ') });
    }

    logToSheet_(data);
    sendOwnerEmail_(data);
    sendGuestEmail_(data);

    return respond_({ result: 'success' });

  } catch (err) {
    return respond_({
      result: 'error',
      message: 'Something went wrong on our end. Please try again, or message us on WhatsApp.'
    });
  } finally {
    if (gotLock) lock.releaseLock();
  }
}

// Lets you open the deployed URL directly in a browser to confirm it's live.
function doGet(e) {
  return ContentService.createTextOutput('Seabreeze booking endpoint is running.');
}

function parseRequest_(e) {
  try {
    if (e && e.postData && e.postData.contents) {
      return JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return null;
  }
  return null;
}

function validate_(data) {
  var errors = [];
  var required = ['name', 'email', 'checkin', 'checkout', 'guests'];

  required.forEach(function (field) {
    if (!data[field] || String(data[field]).trim() === '') {
      errors.push('Missing required field: ' + field + '.');
    }
  });
  if (errors.length) return errors; // don't bother further checks if basics are missing

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(data.email)) {
    errors.push('Please provide a valid email address.');
  }

  var checkin = new Date(data.checkin);
  var checkout = new Date(data.checkout);
  if (isNaN(checkin.getTime()) || isNaN(checkout.getTime())) {
    errors.push('Please provide valid check-in and check-out dates.');
  } else if (checkout <= checkin) {
    errors.push('Check-out date must be after check-in date.');
  }

  var guests = Number(data.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > GUEST_COUNT_MAX) {
    errors.push('Number of guests must be a whole number between 1 and ' + GUEST_COUNT_MAX + '.');
  }

  return errors;
}

function logToSheet_(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Phone', 'Check-in', 'Check-out',
      'Guests', 'Room preference', 'Message'
    ]);
  }
  sheet.appendRow([
    new Date(),
    data.name,
    data.email,
    data.phone || '',
    data.checkin,
    data.checkout,
    data.guests,
    data.room || '',
    data.message || ''
  ]);
}

function sendOwnerEmail_(data) {
  var subject = 'New booking request — ' + data.name;
  var body =
    'New booking request from the website:\n\n' +
    'Name: ' + data.name + '\n' +
    'Email: ' + data.email + '\n' +
    'Phone: ' + (data.phone || 'Not provided') + '\n' +
    'Check-in: ' + data.checkin + '\n' +
    'Check-out: ' + data.checkout + '\n' +
    'Guests: ' + data.guests + '\n' +
    'Room preference: ' + (data.room || 'Not specified') + '\n' +
    'Message: ' + (data.message || 'None') + '\n';

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    replyTo: data.email,
    subject: subject,
    body: body
  });
}

function sendGuestEmail_(data) {
  var subject = 'We\u2019ve received your booking request \u2014 Seabreeze Resort';
  var body =
    'Hi ' + data.name + ',\n\n' +
    'Thanks for your booking request at Seabreeze Resort! Here\u2019s what you sent us:\n\n' +
    'Check-in: ' + data.checkin + '\n' +
    'Check-out: ' + data.checkout + '\n' +
    'Guests: ' + data.guests + '\n' +
    'Room preference: ' + (data.room || 'Not specified') + '\n\n' +
    'This is a request, not a confirmed booking \u2014 we check availability and reply by email, ' +
    'usually within 24 hours.\n\n' +
    'If it\u2019s urgent, message us directly on WhatsApp: https://wa.me/6281356409136\n\n' +
    'See you on Bunaken!\n' +
    'Seabreeze Resort';

  MailApp.sendEmail({
    to: data.email,
    replyTo: OWNER_EMAIL,
    subject: subject,
    body: body
  });
}

function respond_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
