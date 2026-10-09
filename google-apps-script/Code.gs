/**
 * M20 Learning Index — Google Sheets submission sink.
 *
 * Receives one JSON payload per submission from the app (Request portal and Share
 * portal) and appends a row to the matching tab. Re-posting the same submission id
 * updates that row instead of creating a duplicate, so client retries are safe.
 *
 * SETUP (once, in your Google account)
 * ------------------------------------
 *  1. Create a blank Google Sheet.
 *  2. Extensions > Apps Script. (Bound to the sheet is fine.)
 *  3. Delete the placeholder code and paste this whole file over Code.gs.
 *     If the script is NOT bound to the sheet, paste the sheet id from its URL
 *     (the long string between /d/ and /edit) into SPREADSHEET_ID below.
 *  4. Save. Then Deploy > New deployment:
 *        Type: Web app
 *        Execute as: Me
 *        Who has access: Anyone
 *     Copy the URL ending in /exec.
 *  5. In the app, open the "Google Sheets sync" card and paste that /exec URL.
 *     (Or set VITE_SUBMIT_SHEET_URL at build time.)
 *
 * Tabs are created with headers on the first write, so step 6 is optional.
 *  6. To create the tabs up front, run setupSheets() once from the editor, or open
 *     the /exec URL with ?action=setup appended.
 *
 * AFTER EDITING THIS FILE: Deploy > Manage deployments > edit > Version: New version.
 */

/** Set this only if the script is not bound to the sheet. */
var SPREADSHEET_ID = '';

/**
 * Tab name and column order per submission kind. Keys must match the app's payload.
 * 'Status' and 'Last Updated' are rewritten whenever the reviewer changes a status
 * in the app: the client re-posts the whole record, and the row is updated in place.
 */
var SHEETS = {
  request: {
    tab: 'Requests',
    columns: [
      'Project Title',
      'Branch',
      'Category',
      'Description',
      'Experience',
      'Timeline',
      'Budget',
      'Name',
      'Email',
      'Status',
      'Last Updated',
    ],
  },
  share: {
    tab: 'Shares',
    columns: [
      'Project Title',
      'Branch',
      'Category',
      'Description',
      'Difficulty',
      'Tech Stack',
      'Duration',
      'Estimated Cost',
      'Resource Links',
      'Author Name',
      'Author Email',
      'Author Bio',
      'Status',
      'Last Updated',
    ],
  },
};

var LOG_TAB = 'Sync Log';
var LOG_COLUMNS = ['Received At', 'Type', 'Submission ID', 'Action', 'Tab', 'Message'];

/* ------------------------------------------------------------------ plumbing */

function openSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  throw new Error(
    'No spreadsheet: bind this script to a Sheet, or set SPREADSHEET_ID at the top of the file.'
  );
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/** Returns { sheet, columns }, creating the tab and its header row if needed. */
function resolveTab_(kind) {
  var cfg = SHEETS[kind];
  if (!cfg) throw new Error('Unknown submission kind: ' + kind);

  var ss = openSpreadsheet_();
  var sheet = ss.getSheetByName(cfg.tab);
  if (!sheet) sheet = ss.insertSheet(cfg.tab);

  var header = sheet.getRange(1, 1, 1, cfg.columns.length);
  var current = header.getValues()[0].join('|');
  if (current !== cfg.columns.join('|')) {
    header.setValues([cfg.columns]);
    header.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return { sheet: sheet, columns: cfg.columns, tab: cfg.tab };
}

/** Column A holds the submission id; returns the row number or 0. */
function findRowById_(sheet, id) {
  if (!id) return 0;
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

/** Columns: A id, B submitted at, then one column per SHEETS[kind].columns entry. */
function writeSubmission_(kind, submission) {
  var tab = resolveTab_(kind);
  var values = tab.columns.map(function (name) {
    var v = submission.fields ? submission.fields[name] : '';
    return v === undefined || v === null ? '' : String(v);
  });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var row = findRowById_(tab.sheet, submission.id);
    if (row) {
      tab.sheet.getRange(row, 3, 1, values.length).setValues([values]);
      return { action: 'updated', row: row, tab: tab.tab };
    }
    tab.sheet.appendRow(
      [String(submission.id), String(submission.submittedAt || '')].concat(values)
    );
    return { action: 'appended', row: tab.sheet.getLastRow(), tab: tab.tab };
  } finally {
    lock.releaseLock();
  }
}

function log_(kind, id, action, tab, message) {
  try {
    var ss = openSpreadsheet_();
    var sheet = ss.getSheetByName(LOG_TAB);
    if (!sheet) sheet = ss.insertSheet(LOG_TAB);
    var header = sheet.getRange(1, 1, 1, LOG_COLUMNS.length);
    if (header.getValues()[0].join('|') !== LOG_COLUMNS.join('|')) {
      header.setValues([LOG_COLUMNS]);
      header.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.appendRow([
      new Date().toISOString(),
      String(kind || ''),
      String(id || ''),
      String(action || ''),
      String(tab || ''),
      String(message || ''),
    ]);
  } catch (err) {
    // logging must never break a submission
  }
}

/* -------------------------------------------------------------------- routes */

function doPost(e) {
  var body = (e && e.postData && e.postData.contents) || '';
  var submission;
  try {
    submission = JSON.parse(body);
  } catch (err) {
    log_('', '', 'rejected', '', 'body was not valid JSON');
    return json_({ ok: false, error: 'Body was not valid JSON' });
  }

  var kind = submission && submission.kind;
  if (!kind || !SHEETS[kind]) {
    log_(kind, submission && submission.id, 'rejected', '', 'unknown kind');
    return json_({
      ok: false,
      error: 'Unknown or missing "kind" (expected request or share)',
    });
  }

  try {
    var result = writeSubmission_(kind, submission);
    log_(kind, submission.id, result.action, result.tab, String(submission.reason || 'submission'));
    return json_({
      ok: true,
      action: result.action,
      row: result.row,
      tab: result.tab,
      receivedAt: new Date().toISOString(),
    });
  } catch (err) {
    log_(kind, submission.id, 'failed', SHEETS[kind].tab, err && err.message);
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Health check used by the app's "Test" button. Also handles ?action=setup. */
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    if (params.action === 'setup') {
      setupSheets();
      return json_({ ok: true, setup: true });
    }

    var ss = openSpreadsheet_();
    var tabs = Object.keys(SHEETS).map(function (kind) {
      var name = SHEETS[kind].tab;
      var sheet = ss.getSheetByName(name);
      return {
        tab: name,
        rows: sheet ? Math.max(0, sheet.getLastRow() - 1) : 0,
      };
    });
    return json_({
      ok: true,
      app: 'M20 submissions',
      spreadsheet: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      tabs: tabs,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

/** Creates both tabs with headers. Run from the editor, or hit ?action=setup. */
function setupSheets() {
  var created = [];
  Object.keys(SHEETS).forEach(function (kind) {
    var tab = resolveTab_(kind);
    tab.sheet.autoResizeColumns(1, tab.columns.length + 2);
    created.push(tab.tab);
  });
  log_('', '', 'setup', created.join(', '), 'tabs ready');
  return created;
}
