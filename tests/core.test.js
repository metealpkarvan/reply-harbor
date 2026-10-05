import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/core.js";
const today = "2026-10-05";
const item = (id = "one", over = {}) => ({
  id,
  name: "Deniz",
  topic: "Kahve saati",
  channel: "signal",
  energy: 1,
  priority: 2,
  minutes: 2,
  status: "waiting",
  added: "2026-10-01",
  when: "",
  draft: "",
  ...over,
});
test("archive round trip preserves edited draft", () => {
  const a = { items: [item("a", { draft: "Saat üç uygun mu?" })] };
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(a))), a);
});
test("only eligible energy enters a batch", () =>
  assert.deepEqual(
    C.chooseBatch(
      [item("light"), item("high", { energy: 3 })],
      1,
      10,
      today,
    ).items.map((r) => r.id),
    ["light"],
  ));
test("future follow-up stays out of current batch", () =>
  assert.equal(
    C.chooseBatch([item("a", { when: "2026-10-06" })], 3, 10, today).items
      .length,
    0,
  ));
test("follow-up on today is available", () =>
  assert.equal(
    C.chooseBatch([item("a", { when: today })], 1, 10, today).items.length,
    1,
  ));
test("replied and parked records stay out", () =>
  assert.equal(
    C.chooseBatch(
      [item("a", { status: "replied" }), item("b", { status: "parked" })],
      3,
      10,
      today,
    ).items.length,
    0,
  ));
test("batch is bounded at three conversations", () =>
  assert.equal(
    C.chooseBatch(
      ["a", "b", "c", "d"].map((id) => item(id)),
      3,
      30,
      today,
    ).items.length,
    3,
  ));
test("batch fits a declared time limit", () =>
  assert.equal(
    C.chooseBatch(
      [item("a", { minutes: 7 }), item("b", { minutes: 7 })],
      3,
      10,
      today,
    ).minutes,
    7,
  ));
test("higher declared priority wins within budget", () =>
  assert.equal(
    C.chooseBatch(
      [item("a", { priority: 1 }), item("b", { priority: 3 })],
      3,
      2,
      today,
    ).items[0].id,
    "b",
  ));
test("scheduled conversation is preferred at same declared priority", () =>
  assert.equal(
    C.chooseBatch([item("a"), item("b", { when: today })], 3, 2, today).items[0]
      .id,
    "b",
  ));
test("all Turkish template kinds include name", () => {
  for (const k of ["ack", "reconnect", "boundary"])
    assert.ok(C.draft(item(), k, "tr").includes("Deniz"));
});
test("English templates are independent", () =>
  assert.ok(C.draft(item(), "ack", "en").startsWith("Hi Deniz")));
test("draft does not invent a reason or deadline", () => {
  const d = C.draft(item(), "ack", "tr");
  assert.ok(!d.includes("yarın"));
  assert.ok(!d.includes("hastayım"));
});
test("unknown templates rejected", () =>
  assert.throws(() => C.draft(item(), "apology", "tr")));
test("Turkish search handles diacritics", () =>
  assert.equal(C.fold("IŞIK İÇİN"), "isik icin"));
for (const [name, over] of [
  ["unknown channel", { channel: "private-api" }],
  ["bad energy", { energy: 0 }],
  ["bad priority", { priority: 4 }],
  ["bad duration", { minutes: 31 }],
  ["fractional duration", { minutes: 2.5 }],
  ["bad status", { status: "sent-by-app" }],
  ["missing name", { name: "" }],
  ["missing context", { topic: "" }],
  ["missing date", { added: "" }],
  ["oversized draft", { draft: "x".repeat(2001) }],
])
  test("reject " + name, () =>
    assert.throws(() => C.validate({ items: [item("a", over)] })),
  );
test("duplicate IDs rejected", () =>
  assert.throws(() => C.validate({ items: [item(), item()] })));
test("capacity is bounded", () =>
  assert.throws(() =>
    C.validate({
      items: Array.from({ length: 101 }, (_, i) => item(String(i))),
    }),
  ));
test("missing follow-up date refuses calendar export", () =>
  assert.throws(() => C.calendar(item())));
test("calendar uses an exclusive next-day end across year boundary", () => {
  const ics = C.calendar(item("a", { when: "2026-12-31" }));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261231"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20270101"));
});
test("calendar escapes newline semicolon comma and backslash", () =>
  assert.equal(C.calendarEscape("a,b;c\\d\r\nnext"), "a\\,b\\;c\\\\d\\nnext"));
test("lone carriage returns cannot create injected calendar lines", () =>
  assert.equal(
    C.calendarEscape("hello\rBEGIN:VEVENT"),
    "hello\\nBEGIN:VEVENT",
  ));
test("folding respects UTF-8 byte limits and preserves text", () => {
  const line = "DESCRIPTION:" + "çay☕".repeat(50);
  const folded = C.calendarFold(line);
  for (const part of folded.split("\r\n"))
    assert.ok(new TextEncoder().encode(part).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ""), line);
});
test("calendar serializes CRLF and no alarm is implied", () => {
  const ics = C.calendar(item("a", { when: today }));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(!ics.includes("VALARM"));
});
test("malformed timestamps rejected", () =>
  assert.throws(() => C.calendar(item("a", { when: today }), "wrong")));
test("invalid leap date rejected", () =>
  assert.throws(() => C.date("2026-02-29")));
test("invalid energy budget rejected", () =>
  assert.throws(() => C.chooseBatch([item()], 4, 10, today)));
test("Markdown preserves draft and labels manual sending", () => {
  const out = C.markdown([item("a", { draft: "Hi!" })]);
  assert.ok(out.includes("Hi!"));
  assert.ok(out.includes("manually outside"));
});
