export function text(value, max) {
  if (typeof value !== "string" || value.length > max || value.includes("\0"))
    throw Error("Invalid text field");
  return value;
}
export function date(value) {
  if (value === "") return "";
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw Error("Invalid calendar date");
  return value;
}
export function fold(value) {
  return String(value)
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}
export function validate(value) {
  if (!value || !Array.isArray(value.items) || value.items.length > 100)
    throw Error("Archive supports up to 100 conversations");
  const ids = new Set();
  return {
    items: value.items.map((r) => {
      if (!r || typeof r !== "object") throw Error("Invalid conversation");
      const id = text(r.id, 100),
        name = text(r.name, 100).trim(),
        topic = text(r.topic, 600).trim();
      if (!id || ids.has(id) || !name || !topic)
        throw Error("Unique ID, name and context required");
      ids.add(id);
      if (
        ![
          "whatsapp",
          "signal",
          "sms",
          "email",
          "x",
          "reddit",
          "other",
        ].includes(r.channel) ||
        ![1, 2, 3].includes(r.energy) ||
        ![1, 2, 3].includes(r.priority) ||
        !Number.isInteger(r.minutes) ||
        r.minutes < 1 ||
        r.minutes > 30 ||
        !["waiting", "replied", "parked"].includes(r.status)
      )
        throw Error("Invalid conversation options");
      return {
        id,
        name,
        topic,
        channel: r.channel,
        energy: r.energy,
        priority: r.priority,
        minutes: r.minutes,
        status: r.status,
        added:
          date(r.added) ||
          (() => {
            throw Error("Capture date required");
          })(),
        when: date(r.when),
        draft: text(r.draft, 2000),
      };
    }),
  };
}
export function chooseBatch(items, energy, budget, today) {
  if (
    ![1, 2, 3].includes(energy) ||
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > 30
  )
    throw Error("Invalid batch budget");
  date(today);
  const eligible = items.filter(
    (r) =>
      r.status === "waiting" &&
      r.energy <= energy &&
      (!r.when || r.when <= today),
  );
  const score = (r) => r.priority * 100 + (r.when ? 30 : 0);
  let best = [],
    weight = 0,
    duration = 0;
  function consider(rows) {
    const cost = rows.reduce((n, r) => n + r.minutes, 0);
    if (cost > budget) return;
    const s = rows.reduce((n, r) => n + score(r), 0);
    if (
      s > weight ||
      (s === weight &&
        (rows.length > best.length ||
          (rows.length === best.length && cost < duration)))
    ) {
      best = [...rows];
      weight = s;
      duration = cost;
    }
  }
  for (let a = 0; a < eligible.length; a++) {
    consider([eligible[a]]);
    for (let b = a + 1; b < eligible.length; b++) {
      consider([eligible[a], eligible[b]]);
      for (let c = b + 1; c < eligible.length; c++)
        consider([eligible[a], eligible[b], eligible[c]]);
    }
  }
  return { items: best, minutes: duration };
}
export function draft(item, kind, language = "tr") {
  if (
    !["ack", "reconnect", "boundary"].includes(kind) ||
    !["tr", "en"].includes(language)
  )
    throw Error("Unknown draft template");
  const name = text(item.name, 100);
  const templates = {
    tr: {
      ack: `Merhaba ${name}, mesajını gördüm. Şu anda ayrıntılı cevap vermek için zaman ayıramıyorum. Uygun olduğumda döneceğim.`,
      reconnect: `Merhaba ${name}, bir süredir yazamadım. Yeniden haberleşmek istedim. Nasılsın?`,
      boundary: `Merhaba ${name}, şu anda bunu üstlenemeyeceğim. Haber verdiğin için teşekkür ederim.`,
    },
    en: {
      ack: `Hi ${name}, I saw your message. I don't have room for a detailed reply right now. I'll get back to you when I can.`,
      reconnect: `Hi ${name}, I haven't been in touch for a while. I wanted to reconnect. How are you?`,
      boundary: `Hi ${name}, I can't take this on right now. Thank you for letting me know.`,
    },
  };
  return templates[language][kind];
}
export function calendarEscape(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function calendarFold(line) {
  const enc = new TextEncoder();
  let result = "",
    current = "",
    size = 0;
  for (const char of line) {
    const bytes = enc.encode(char).length;
    if (size + bytes > 75) {
      result += current + "\r\n";
      current = " ";
      size = 1;
    }
    current += char;
    size += bytes;
  }
  return result + current;
}
export function calendar(item, stamp = "20261005T000000Z") {
  date(item.when);
  if (!item.when) throw Error("Choose a follow-up date first");
  if (!/^\d{8}T\d{6}Z$/.test(stamp)) throw Error("Invalid UTC timestamp");
  const d = new Date(item.when + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  const end = d.toISOString().slice(0, 10).replace(/-/g, "");
  const uid = encodeURIComponent(item.id) + "@reply-harbor.local";
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Mete Alp Karvan//Reply Harbor 1.0//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + uid,
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + item.when.replace(/-/g, ""),
      "DTEND;VALUE=DATE:" + end,
      "SUMMARY:" + calendarEscape("Reply · " + item.name),
      "DESCRIPTION:" +
        calendarEscape(
          item.topic +
            "\nDraft: " +
            item.draft +
            "\nThis is a reminder to review and reply manually.",
        ),
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(calendarFold)
      .join("\r\n") + "\r\n"
  );
}
export function markdown(items) {
  return [
    "# Reply Harbor personal desk",
    "",
    "This is a planning record. Messages are sent manually outside this app.",
    "",
    ...items.flatMap((r) => [
      `## ${r.name}`,
      `Channel: ${r.channel} · State: ${r.status}`,
      `Context: ${r.topic}`,
      `Follow-up date: ${r.when || "none"}`,
      "",
      r.draft || "No draft.",
      "",
    ]),
  ].join("\n");
}
