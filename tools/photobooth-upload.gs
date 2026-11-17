/**
 * Captcha! 포토부스 사진 업로드 창구 (Google Apps Script 웹 앱)
 * - 사이트가 보낸 사진(JPEG, base64)을 드라이브 폴더에 저장하고, 링크가 있는 사람은 볼 수 있게 공유한 뒤 파일 ID를 돌려준다.
 * - cleanup()을 시간 트리거로 돌려 30분 지난 사진은 휴지통으로 보낸다.
 * 배포: 배포 > 새 배포 > 웹 앱 / 실행 사용자: 나 / 액세스: 모든 사용자
 */
var FOLDER_NAME = 'Captcha_Photobooth';
var KEEP_MINUTES = 30;

function folder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function doPost(e) {
  try {
    var b64 = String(e.postData.contents || '').replace(/^data:image\/\w+;base64,/, '');
    if (!b64 || b64.length > 15 * 1024 * 1024) throw new Error('bad size');
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', 'captcha_' + Date.now() + '.jpg');
    var file = folder_().createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return json_({ ok: true, id: file.getId() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function cleanup() {
  var files = folder_().getFiles(), limit = Date.now() - KEEP_MINUTES * 60 * 1000;
  while (files.hasNext()) { var f = files.next(); if (f.getDateCreated().getTime() < limit) f.setTrashed(true); }
}

/** 처음 한 번 실행: 10분마다 cleanup이 돌도록 트리거 등록 (권한 허용 창이 뜸) */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('cleanup').timeBased().everyMinutes(10).create();
  folder_();
}
