"use strict";
// Keep invitation links shared before the game selector was introduced working.
const roomCode = new URLSearchParams(location.search).get("room");
if (/^[0-9]{6}$/.test(roomCode)) {
  location.replace("./gomoku.html?room=" + roomCode);
}
