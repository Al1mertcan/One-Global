/* Hemcan — kullanıcı profili (ad, soyad, e-posta).
 * Bilgiler YALNIZCA bu cihazda (localStorage 'one-profile') tutulur; sunucuya gönderilmez. */
(function (global) {
  'use strict';
  var KEY = 'one-profile';
  function get() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || 'null');
      return p && typeof p === 'object' ? p : null;
    } catch (e) { return null; }
  }
  function set(p) {
    var clean = {
      first: String((p && p.first) || '').trim().slice(0, 40),
      last: String((p && p.last) || '').trim().slice(0, 40),
      email: String((p && p.email) || '').trim().slice(0, 120),
    };
    try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch (e) {}
    return clean;
  }
  function emailOk(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim()); }
  function valid(p) { return !!(p && String(p.first || '').trim() && String(p.last || '').trim() && emailOk(p.email)); }
  function has() { return valid(get()); }
  // "ali mertcan" -> "Ali"; Türkçe büyük/küçük harf kurallarıyla.
  function firstName() {
    var p = get();
    var n = p && p.first ? String(p.first).trim().split(/\s+/)[0] : '';
    if (!n) return '';
    var lower = n;
    try { lower = n.toLocaleLowerCase('tr'); } catch (e) { lower = n.toLowerCase(); }
    var first = lower.charAt(0);
    try { first = first.toLocaleUpperCase('tr'); } catch (e) { first = first.toUpperCase(); }
    return first + lower.slice(1);
  }
  global.ONE_PROFILE = { get: get, set: set, valid: valid, has: has, emailOk: emailOk, firstName: firstName };
})(window);
