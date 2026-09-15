require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  Browsers,
  downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");

/* =========================================================
   NICOLAS ULTRA XMD
   VERSION 3.0.0
   CONNEXION : PAIRING CODE UNIQUEMENT
========================================================= */

const BOT_NAME = "NICOLAS ULTRA XMD";
const VERSION = "3.0.0";
const PREFIX = ".";

const AUTH_DIR =
  process.env.AUTH_DIR ||
  "/app/auth_info_baileys";

const OWNER_NAME = "Nicolas";
const OWNER_TELEGRAM = "@Sage_ou_Nicolas";

/* =========================================================
   NUMERO DE PAIRING
========================================================= */

function normalizeNumber(number = "") {
  return String(number)
    .replace(/\D/g, "")
    .replace(/^00/, "");
}

const OWNER_NUMBER = normalizeNumber(
  process.env.OWNER_NUMBER ||
  process.env.PAIRING_NUMBER ||
  ""
);

const OWNER_JID = OWNER_NUMBER
  ? `${OWNER_NUMBER}@s.whatsapp.net`
  : "";

/* =========================================================
   IMAGES
========================================================= */

const OFFICIAL_IMAGES = {
  menu: "https://k.top4top.io/p_3908er0dq1.jpg",

  extra: [
    "https://d.top4top.io/p_3908obklo1.jpg",
    "https://g.top4top.io/p_3908zypj21.jpg",
    "https://l.top4top.io/p_3908fnurj1.jpg",
    "https://g.top4top.io/p_39084ldec1.jpg",
    "https://l.top4top.io/p_3908v7w381.jpgr"
  ],

  welcome:
    "https://j.top4top.io/p_3908uvx8h1.jpg",

  goodbye:
    "https://a.top4top.io/p_3908mjw7j1.jpg",

  ping:
    "https://f.top4top.io/p_3908b1cay1.jpg",

  alive:
    "https://k.top4top.io/p_3908fwts41.jpg"
};

/* =========================================================
   MENU MUSIC
========================================================= */

const MENU_MUSIC = path.join(
  process.cwd(),
  "assets",
  "menu.m4a"
);

/* =========================================================
   THEMES
========================================================= */

const THEMES = [
  "solo",
  "naruto",
  "onepiece",
  "bleach",
  "demon",
  "dragonball",
  "jujutsu",
  "aot",
  "hxh",
  "blackclover"
];

/* =========================================================
   DATA
========================================================= */

const DATA_DIR = path.join(
  process.cwd(),
  "data"
);

const THEME_FILE = path.join(
  DATA_DIR,
  "theme.json"
);

const SUDO_FILE = path.join(
  DATA_DIR,
  "sudo.json"
);

const AFK_FILE = path.join(
  DATA_DIR,
  "afk.json"
);

const PROTECTION_FILE = path.join(
  DATA_DIR,
  "protections.json"
);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }
}

function ensureJSON(file, defaultValue) {
  ensureDir(
    path.dirname(file)
  );

  if (!fs.existsSync(file)) {
    fs.writeFileSync(
      file,
      JSON.stringify(
        defaultValue,
        null,
        2
      )
    );
  }
}

function readJSON(file, fallback) {
  try {
    ensureJSON(
      file,
      fallback
    );

    return JSON.parse(
      fs.readFileSync(
        file,
        "utf8"
      )
    );
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureDir(
    path.dirname(file)
  );

  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

ensureJSON(
  THEME_FILE,
  {
    global: "solo",
    groups: {}
  }
);

ensureJSON(
  SUDO_FILE,
  []
);

ensureJSON(
  AFK_FILE,
  {}
);

ensureJSON(
  PROTECTION_FILE,
  {}
);

/* =========================================================
   ETAT
========================================================= */

let sock = null;
let reconnectTimer = null;

let starting = false;
let botGeneration = 0;

let pairingRequested = false;
let pairingInProgress = false;

/* =========================================================
   UTILS
========================================================= */

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

function randomItem(array) {
  if (
    !array ||
    !array.length
  ) {
    return null;
  }

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}

function jidToNumber(jid = "") {
  return String(jid)
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function isGroupJid(jid = "") {
  return jid.endsWith("@g.us");
}

function getSenderJid(message) {
  if (!message) {
    return "";
  }

  return (
    message.key?.participant ||
    message.key?.remoteJid ||
    ""
  );
}

function isOwner(jid) {
  if (!jid) {
    return false;
  }

  if (!OWNER_NUMBER) {
    return false;
  }

  return (
    jidToNumber(jid) ===
    OWNER_NUMBER
  );
}

function getSudo() {
  return readJSON(
    SUDO_FILE,
    []
  );
}

function isSudo(jid) {
  const number =
    jidToNumber(jid);

  return getSudo()
    .map(normalizeNumber)
    .includes(number);
}

function hasOwnerAccess(jid) {
  return (
    isOwner(jid) ||
    isSudo(jid)
  );
}

function escapeHTML(text = "") {
  return String(text)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}

/* =========================================================
   MESSAGE TEXT
========================================================= */

function getText(message) {
  if (!message) {
    return "";
  }

  const content =
    message.message || {};

  if (
    content.conversation
  ) {
    return content.conversation;
  }

  if (
    content.extendedTextMessage
      ?.text
  ) {
    return (
      content
        .extendedTextMessage
        .text
    );
  }

  if (
    content.imageMessage
      ?.caption
  ) {
    return (
      content
        .imageMessage
        .caption
    );
  }

  if (
    content.videoMessage
      ?.caption
  ) {
    return (
      content
        .videoMessage
        .caption
    );
  }

  return "";
}

/* =========================================================
   SEND
========================================================= */

async function react(
  jid,
  messageKey,
  emoji
) {
  try {
    await sock.sendMessage(
      jid,
      {
        react: {
          text: emoji,
          key: messageKey
        }
      }
    );
  } catch {}
}

async function sendText(
  jid,
  text,
  options = {}
) {
  return sock.sendMessage(
    jid,
    {
      text: String(text),
      ...options
    }
  );
}

async function sendImage(
  jid,
  url,
  caption = ""
) {
  return sock.sendMessage(
    jid,
    {
      image: {
        url
      },
      caption
    }
  );
}

/* =========================================================
   THEMES
========================================================= */

function getCurrentTheme(jid) {
  const data =
    readJSON(
      THEME_FILE,
      {
        global: "solo",
        groups: {}
      }
    );

  if (
    isGroupJid(jid) &&
    data.groups[jid]
  ) {
    return data.groups[jid];
  }

  return (
    data.global ||
    "solo"
  );
}

function setTheme(
  jid,
  theme
) {
  const data =
    readJSON(
      THEME_FILE,
      {
        global: "solo",
        groups: {}
      }
    );

  if (
    !THEMES.includes(theme)
  ) {
    return false;
  }

  if (isGroupJid(jid)) {
    data.groups[jid] =
      theme;
  } else {
    data.global =
      theme;
  }

  writeJSON(
    THEME_FILE,
    data
  );

  return true;
}

/* =========================================================
   GROUP HELPERS
========================================================= */

async function getGroupMetadata(
  jid
) {
  return sock.groupMetadata(
    jid
  );
}

async function getGroupAdmins(
  jid
) {
  const metadata =
    await getGroupMetadata(
      jid
    );

  return metadata.participants
    .filter(
      p =>
        p.admin === "admin" ||
        p.admin ===
          "superadmin"
    )
    .map(
      p => p.id
    );
}

async function isAdmin(
  jid,
  userJid
) {
  const admins =
    await getGroupAdmins(
      jid
    );

  return admins.includes(
    userJid
  );
}

async function isBotAdmin(
  jid
) {
  if (!sock?.user?.id) {
    return false;
  }

  return isAdmin(
    jid,
    sock.user.id
  );
}

function getTargetJid(
  message,
  args
) {
  const mentioned =
    message.message
      ?.extendedTextMessage
      ?.contextInfo
      ?.mentionedJid ||
    [];

  if (
    mentioned.length
  ) {
    return mentioned[0];
  }

  const quoted =
    message.message
      ?.extendedTextMessage
      ?.contextInfo
      ?.participant;

  if (quoted) {
    return quoted;
  }

  if (args?.[0]) {
    const number =
      normalizeNumber(
        args[0]
      );

    if (number) {
      return (
        number +
        "@s.whatsapp.net"
      );
    }
  }

  return null;
}

/* =========================================================
   FANCY
========================================================= */

const FANCY_STYLES = [

  text =>
    String(text)
      .split("")
      .map(c => {
        const map = {
          A: "𝑨",
          B: "𝑩",
          C: "𝑪",
          D: "𝑫",
          E: "𝑬",
          F: "𝑭",
          G: "𝑮",
          H: "𝑯",
          I: "𝑰",
          J: "𝑱",
          K: "𝑲",
          L: "𝑳",
          M: "𝑴",
          N: "𝑵",
          O: "𝑶",
          P: "𝑷",
          Q: "𝑸",
          R: "𝑹",
          S: "𝑺",
          T: "𝑻",
          U: "𝑼",
          V: "𝑽",
          W: "𝑾",
          X: "𝑿",
          Y: "𝒀",
          Z: "𝒁"
        };

        return (
          map[
            c.toUpperCase()
          ] ||
          c
        );
      })
      .join(""),

  text =>
    String(text)
      .split("")
      .map(c => {
        const map = {
          A: "𝓐",
          B: "𝓑",
          C: "𝓒",
          D: "𝓓",
          E: "𝓔",
          F: "𝓕",
          G: "𝓖",
          H: "𝓗",
          I: "𝓘",
          J: "𝓙",
          K: "𝓚",
          L: "𝓛",
          M: "𝓜",
          N: "𝓝",
          O: "𝓞",
          P: "𝓟",
          Q: "𝓠",
          R: "𝓡",
          S: "𝓢",
          T: "𝓣",
          U: "𝓤",
          V: "𝓥",
          W: "𝓦",
          X: "𝓧",
          Y: "𝓨",
          Z: "𝓩"
        };

        return (
          map[
            c.toUpperCase()
          ] ||
          c
        );
      })
      .join(""),

  text =>
    String(text)
      .toUpperCase()
      .split("")
      .map(c => {
        const map = {
          A: "𝗔",
          B: "𝗕",
          C: "𝗖",
          D: "𝗗",
          E: "𝗘",
          F: "𝗙",
          G: "𝗚",
          H: "𝗛",
          I: "𝗜",
          J: "𝗝",
          K: "𝗞",
          L: "𝗟",
          M: "𝗠",
          N: "𝗡",
          O: "𝗢",
          P: "𝗣",
          Q: "𝗤",
          R: "𝗥",
          S: "𝗦",
          T: "𝗧",
          U: "𝗨",
          V: "𝗩",
          W: "𝗪",
          X: "𝗫",
          Y: "𝗬",
          Z: "𝗭"
        };

        return (
          map[c] ||
          c
        );
      })
      .join(""),

  text =>
    String(text)
      .split("")
      .map(c => {
        const map = {
          A: "𝘼",
          B: "𝘽",
          C: "𝘾",
          D: "𝘿",
          E: "𝙀",
          F: "𝙁",
          G: "𝙂",
          H: "𝙃",
          I: "𝙄",
          J: "𝙅",
          K: "𝙆",
          L: "𝙇",
          M: "𝙈",
          N: "𝙉",
          O: "𝙊",
          P: "𝙋",
          Q: "𝙌",
          R: "𝙍",
          S: "𝙎",
          T: "𝙏",
          U: "𝙐",
          V: "𝙑",
          W: "𝙒",
          X: "𝙓",
          Y: "𝙔",
          Z: "𝙕"
        };

        return (
          map[
            c.toUpperCase()
          ] ||
          c
        );
      })
      .join("")
];

function fancy(
  text,
  style = 0
) {
  const fn =
    FANCY_STYLES[
      style %
      FANCY_STYLES.length
    ];

  return fn(text);
}

/* =========================================================
   CONTEXT
========================================================= */

function getContext(
  message
) {
  return (
    message.message
      ?.extendedTextMessage
      ?.contextInfo ||
    {}
  );
}

function getQuoted(
  message
) {
  return getContext(
    message
  ).quotedMessage;
}

function getMentioned(
  message
) {
  return (
    getContext(
      message
    ).mentionedJid ||
    []
  );
}

function cleanMention(
  jid
) {
  return `@${jidToNumber(
    jid
  )}`;
}

function sendMention(
  jid,
  text,
  mentions
) {
  return sock.sendMessage(
    jid,
    {
      text,
      mentions
    }
  );
}

function formatDuration(
  seconds
) {
  const h =
    Math.floor(
      seconds / 3600
    );

  const m =
    Math.floor(
      (seconds % 3600) / 60
    );

  const s =
    Math.floor(
      seconds % 60
    );

  return `${h}h ${m}m ${s}s`;
}

async function requireGroup(
  jid
) {
  if (
    !isGroupJid(jid)
  ) {
    await sendText(
      jid,
      "❌ Cette commande fonctionne uniquement dans un groupe."
    );

    return false;
  }

  return true;
}

async function requireAdmin(
  jid,
  sender
) {
  if (
    hasOwnerAccess(sender)
  ) {
    return true;
  }

  if (
    !(await isAdmin(
      jid,
      sender
    ))
  ) {
    await sendText(
      jid,
      "❌ Commande réservée aux admins."
    );

    return false;
  }

  return true;
}

/* =========================================================
   AFK
========================================================= */

function getAFK() {
  return readJSON(
    AFK_FILE,
    {}
  );
}

function setAFK(
  jid,
  reason
) {
  const data =
    getAFK();

  data[jid] = {
    reason:
      reason ||
      "Aucune raison",
    time:
      Date.now()
  };

  writeJSON(
    AFK_FILE,
    data
  );
}

function clearAFK(
  jid
) {
  const data =
    getAFK();

  if (data[jid]) {
    delete data[jid];

    writeJSON(
      AFK_FILE,
      data
    );

    return true;
  }

  return false;
}

/* =========================================================
   PROTECTION
========================================================= */

function getProtections() {
  return readJSON(
    PROTECTION_FILE,
    {}
  );
}

function setProtection(
  jid,
  type,
  value
) {
  const data =
    getProtections();

  if (!data[jid]) {
    data[jid] = {};
  }

  data[jid][type] =
    value;

  writeJSON(
    PROTECTION_FILE,
    data
  );
}

function getProtection(
  jid,
  type
) {
  const data =
    getProtections();

  return (
    data[jid]?.[type] ||
    false
  );
}

/* =========================================================
   MEDIA
========================================================= */

async function downloadMedia(
  message,
  type
) {
  const stream =
    await downloadContentFromMessage(
      message,
      type
    );

  const chunks = [];

  for await (
    const chunk of stream
  ) {
    chunks.push(chunk);
  }

  return Buffer.concat(
    chunks
  );
}

function getMediaMessage(
  message
) {
  const content =
    message.message || {};

  if (
    content.imageMessage
  ) {
    return {
      type: "image",
      data:
        content.imageMessage
    };
  }

  if (
    content.videoMessage
  ) {
    return {
      type: "video",
      data:
        content.videoMessage
    };
  }

  if (
    content.audioMessage
  ) {
    return {
      type: "audio",
      data:
        content.audioMessage
    };
  }

  if (
    content.stickerMessage
  ) {
    return {
      type: "sticker",
      data:
        content.stickerMessage
    };
  }

  return null;
}

/* =========================================================
   MENU
========================================================= */

function buildMenu(
  jid
) {
  const theme =
    getCurrentTheme(
      jid
    );

  return `
╭━━━〔 ${BOT_NAME} 〕━━━╮
┃
┃ 👑 OWNER : ${OWNER_NAME}
┃ ⚡ VERSION : ${VERSION}
┃ 🎭 THEME : ${theme}
┃ 📌 PREFIX : ${PREFIX}
┃
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━〔 GENERAL 〕━━╮
┃ ${PREFIX}alive
┃ ${PREFIX}ping
┃ ${PREFIX}speed
┃ ${PREFIX}owner
┃ ${PREFIX}repo
┃ ${PREFIX}help
┃ ${PREFIX}list
┃ ${PREFIX}menu
╰━━━━━━━━━━━━━━╯

╭━━〔 OWNER 〕━━╮
┃ ${PREFIX}sudo add
┃ ${PREFIX}sudo del
┃ ${PREFIX}sudo list
┃ ${PREFIX}pair
┃ ${PREFIX}purge
╰━━━━━━━━━━━━━━╯

╭━━〔 GROUP 〕━━╮
┃ ${PREFIX}add
┃ ${PREFIX}ban
┃ ${PREFIX}kick
┃ ${PREFIX}promote
┃ ${PREFIX}demote
┃ ${PREFIX}tag
┃ ${PREFIX}tagall
┃ ${PREFIX}groupinfo
┃ ${PREFIX}listadmin
┃ ${PREFIX}staff
┃ ${PREFIX}link
┃ ${PREFIX}revoke
┃ ${PREFIX}groupname
┃ ${PREFIX}setgdesc
┃ ${PREFIX}left
╰━━━━━━━━━━━━━━╯

╭━━〔 PROTECTION 〕━━╮
┃ ${PREFIX}antilink
┃ ${PREFIX}antipromote
╰━━━━━━━━━━━━━━━━━━╯

╭━━〔 MEDIA / FUN 〕━━╮
┃ ${PREFIX}afk
┃ ${PREFIX}fancy
┃ ${PREFIX}pinterest
┃ ${PREFIX}pin
┃ ${PREFIX}couple
┃ ${PREFIX}couplepp
┃ ${PREFIX}play
┃ ${PREFIX}song
┃ ${PREFIX}kiki
┃ ${PREFIX}take
┃ ${PREFIX}tourl
┃ ${PREFIX}ssweb
┃ ${PREFIX}getpp
┃ ${PREFIX}delete
┃ ${PREFIX}theme
╰━━━━━━━━━━━━━━━━━━━╯

╭━━〔 NICOLAS ULTRA 〕━━╮
┃ 👑 ${OWNER_NAME}
┃ 🤖 ${BOT_NAME}
┃ ⚔️ Shadow Monarch Mode
╰━━━━━━━━━━━━━━━━━━━━━━╯
`;
}

async function sendMenu(
  jid
) {
  const menu =
    buildMenu(jid);

  try {
    await sock.sendMessage(
      jid,
      {
        image: {
          url:
            OFFICIAL_IMAGES.menu
        },
        caption: menu
      }
    );
  } catch {
    await sendText(
      jid,
      menu
    );
  }

  if (
    fs.existsSync(
      MENU_MUSIC
    )
  ) {
    try {
      await sock.sendMessage(
        jid,
        {
          audio:
            fs.readFileSync(
              MENU_MUSIC
            ),
          mimetype:
            "audio/mp4",
          ptt: false
        }
      );
    } catch {}
  }
}

/* =========================================================
   PINTEREST
========================================================= */

async function pinterestSearch(
  query
) {
  const url =
    `https://api.giftedtech.co.ke/api/search/pinterest?apikey=gifted&query=${encodeURIComponent(query)}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      "Pinterest API error"
    );
  }

  const data =
    await response.json();

  if (
    !data.success ||
    !data.result ||
    !data.result.length
  ) {
    throw new Error(
      "No Pinterest result"
    );
  }

  return data.result.slice(
    0,
    5
  );
}

/* =========================================================
   YOUTUBE
========================================================= */

async function youtubeAudio(
  query
) {
  let yts;

  try {
    yts = require(
      "yt-search"
    );
  } catch {
    throw new Error(
      "yt-search non installé"
    );
  }

  let ytdl;

  try {
    ytdl = require(
      "@distube/ytdl-core"
    );
  } catch {
    throw new Error(
      "@distube/ytdl-core non installé"
    );
  }

  const result =
    await yts(query);

  if (
    !result.videos ||
    !result.videos.length
  ) {
    throw new Error(
      "Aucune vidéo trouvée"
    );
  }

  const video =
    result.videos[0];

  const stream =
    ytdl(
      video.url,
      {
        filter:
          "audioonly",
        quality:
          "highestaudio"
      }
    );

  const chunks = [];

  let totalSize = 0;

  for await (
    const chunk of stream
  ) {
    chunks.push(chunk);

    totalSize +=
      chunk.length;

    if (
      totalSize >
      15 * 1024 * 1024
    ) {
      stream.destroy();

      throw new Error(
        "Audio trop lourd"
      );
    }
  }

  return {
    buffer:
      Buffer.concat(
        chunks
      ),
    title:
      video.title,
    url:
      video.url
  };
}

/* =========================================================
   PARSER
========================================================= */

function parseCommand(
  text
) {
  if (
    !text ||
    !text.startsWith(
      PREFIX
    )
  ) {
    return null;
  }

  const body =
    text
      .slice(
        PREFIX.length
      )
      .trim();

  if (!body) {
    return null;
  }

  const parts =
    body.split(
      /\s+/
    );

  const command =
    parts
      .shift()
      .toLowerCase();

  return {
    command,
    args: parts,
    text:
      parts.join(" ")
  };
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(
  message,
  jid,
  sender,
  command,
  args,
  text
) {
  switch (command) {

    /* ================= GENERAL ================= */

    case "menu":
    case "help":
      await sendMenu(
        jid
      );
      break;

    case "alive":
      await sendImage(
        jid,
        OFFICIAL_IMAGES.alive,
        `🤖 ${BOT_NAME}

✅ Bot actif
⚡ Version ${VERSION}`
      );
      break;

    case "ping": {
      const start =
        Date.now();

      await react(
        jid,
        message.key,
        "🏓"
      );

      const speed =
        Date.now() -
        start;

      await sendImage(
        jid,
        OFFICIAL_IMAGES.ping,
        `🏓 PONG

⚡ ${speed} ms`
      );

      break;
    }

    case "speed": {
      const start =
        Date.now();

      await sendText(
        jid,
        "⚡ Calcul de la vitesse..."
      );

      const speed =
        Date.now() -
        start;

      await sendText(
        jid,
        `🚀 SPEED

⚡ ${speed} ms`
      );

      break;
    }

    case "owner":
      await sendText(
        jid,
        `👑 OWNER

Nom : ${OWNER_NAME}
Telegram : ${OWNER_TELEGRAM}
WhatsApp : ${
          OWNER_NUMBER ||
          "Non configuré"
        }`
      );
      break;

    case "repo":
      await sendText(
        jid,
        `🔗 ${BOT_NAME}

Version : ${VERSION}

Repository du projet disponible depuis la configuration du bot.`
      );
      break;

    case "list":
      await sendText(
        jid,
        buildMenu(jid)
      );
      break;

    /* ================= OWNER ================= */

    case "sudo": {

      if (
        !isOwner(sender)
      ) {
        await sendText(
          jid,
          "❌ Cette commande est réservée au propriétaire."
        );
        break;
      }

      const action =
        args[0]?.toLowerCase();

      const target =
        getTargetJid(
          message,
          args.slice(1)
        );

      const list =
        getSudo();

      if (
        action === "list"
      ) {
        await sendText(
          jid,
          list.length
            ? `👑 SUDO LIST

${list
  .map(
    (n, i) =>
      `${i + 1}. ${n}`
  )
  .join("\n")}`
            : "❌ Aucun sudo."
        );

        break;
      }

      if (
        !target
      ) {
        await sendText(
          jid,
          `Usage : ${PREFIX}sudo add @user`
        );

        break;
      }

      const number =
        jidToNumber(
          target
        );

      if (
        action === "add"
      ) {

        if (
          !list.includes(
            number
          )
        ) {
          list.push(
            number
          );

          writeJSON(
            SUDO_FILE,
            list
          );
        }

        await sendText(
          jid,
          `✅ ${number} ajouté aux SUDO.`
        );

      } else if (
        action === "del"
      ) {

        const index =
          list.indexOf(
            number
          );

        if (
          index !== -1
        ) {
          list.splice(
            index,
            1
          );

          writeJSON(
            SUDO_FILE,
            list
          );
        }

        await sendText(
          jid,
          `✅ ${number} retiré des SUDO.`
        );
      }

      break;
    }

    case "pair":

      await sendText(
        jid,
        `🔐 PAIRING CODE

Le bot utilise uniquement le Pairing Code.

Numéro configuré :
${
          OWNER_NUMBER
            ? "✅ Oui"
            : "❌ Non"
        }

Redémarre le bot pour générer un nouveau code si nécessaire.`
      );

      break;

    case "purge":

      if (
        !isOwner(sender)
      ) {
        await sendText(
          jid,
          "❌ Owner uniquement."
        );

        break;
      }

      await sendText(
        jid,
        `🧹 NETTOYAGE

⚠️ Pour refaire complètement le pairing, supprime le dossier auth_info_baileys puis redémarre le bot.`
      );

      break;

    /* ================= GROUP ================= */

    case "add":
    case "ban":
    case "kick":
    case "promote":
    case "demote": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      if (
        !(await isBotAdmin(
          jid
        ))
      ) {
        await sendText(
          jid,
          "❌ Je dois être admin pour faire ça."
        );

        break;
      }

      const target =
        getTargetJid(
          message,
          args
        );

      if (!target) {
        await sendText(
          jid,
          `Usage : ${PREFIX}${command} @user`
        );

        break;
      }

      try {

        if (
          command === "add"
        ) {
          await sock.groupParticipantsUpdate(
            jid,
            [target],
            "add"
          );
        }

        if (
          command === "ban" ||
          command === "kick"
        ) {
          await sock.groupParticipantsUpdate(
            jid,
            [target],
            "remove"
          );
        }

        if (
          command === "promote"
        ) {
          await sock.groupParticipantsUpdate(
            jid,
            [target],
            "promote"
          );
        }

        if (
          command === "demote"
        ) {
          await sock.groupParticipantsUpdate(
            jid,
            [target],
            "demote"
          );
        }

        await sendText(
          jid,
          `✅ Action ${command} effectuée.`
        );

      } catch (error) {

        console.error(
          `❌ ${command}:`,
          error
        );

        await sendText(
          jid,
          `❌ Impossible d'effectuer ${command}.`
        );
      }

      break;
    }

    case "tag":
    case "tagall": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      const metadata =
        await getGroupMetadata(
          jid
        );

      const participants =
        metadata.participants
          .map(
            p => p.id
          );

      const messageText =
        text ||
        "📢 Mention générale";

      await sendMention(
        jid,
        `${messageText}

${participants
  .map(cleanMention)
  .join(" ")}`,
        participants
      );

      break;
    }

    case "groupinfo": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      const metadata =
        await getGroupMetadata(
          jid
        );

      await sendText(
        jid,
        `╭━━〔 GROUP INFO 〕━━╮
┃ 👥 Nom : ${metadata.subject}
┃ 👤 Membres : ${metadata.participants.length}
┃ 👑 Créateur : ${
          metadata.owner
            ? cleanMention(
                metadata.owner
              )
            : "Inconnu"
        }
╰━━━━━━━━━━━━━━━━━━╯`
      );

      break;
    }

    case "listadmin":
    case "staff": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      const admins =
        await getGroupAdmins(
          jid
        );

      await sendMention(
        jid,
        `👑 ADMINS

${admins
  .map(cleanMention)
  .join("\n")}`,
        admins
      );

      break;
    }

    case "link": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      try {

        const code =
          await sock.groupInviteCode(
            jid
          );

        await sendText(
          jid,
          `🔗 Lien du groupe :

https://chat.whatsapp.com/${code}`
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de récupérer le lien."
        );
      }

      break;
    }

    case "revoke": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      try {

        await sock.groupRevokeInvite(
          jid
        );

        await sendText(
          jid,
          "✅ Ancien lien révoqué."
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de révoquer le lien."
        );
      }

      break;
    }

    case "groupname": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}groupname Nouveau nom`
        );

        break;
      }

      try {

        await sock.groupUpdateSubject(
          jid,
          text
        );

        await sendText(
          jid,
          "✅ Nom du groupe modifié."
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de modifier le nom."
        );
      }

      break;
    }

    case "setgdesc": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}setgdesc nouvelle description`
        );

        break;
      }

      try {

        await sock.groupUpdateDescription(
          jid,
          text
        );

        await sendText(
          jid,
          "✅ Description modifiée."
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de modifier la description."
        );
      }

      break;
    }

    case "left": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      await sendText(
        jid,
        "👋 Je quitte le groupe..."
      );

      await sleep(
        1000
      );

      await sock.groupLeave(
        jid
      );

      break;
    }

    /* ================= PROTECTION ================= */

    case "antilink": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      const value =
        args[0]?.toLowerCase();

      if (
        ![
          "on",
          "off"
        ].includes(value)
      ) {
        await sendText(
          jid,
          `Usage : ${PREFIX}antilink on/off`
        );

        break;
      }

      setProtection(
        jid,
        "antilink",
        value === "on"
      );

      await sendText(
        jid,
        `🔗 Antilink : ${
          value === "on"
            ? "ACTIVÉ"
            : "DÉSACTIVÉ"
        }`
      );

      break;
    }

    case "antipromote": {

      if (
        !(await requireGroup(
          jid
        ))
      ) break;

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      const value =
        args[0]?.toLowerCase();

      if (
        ![
          "on",
          "off"
        ].includes(value)
      ) {
        await sendText(
          jid,
          `Usage : ${PREFIX}antipromote on/off`
        );

        break;
      }

      setProtection(
        jid,
        "antipromote",
        value === "on"
      );

      await sendText(
        jid,
        `🛡️ Antipromote : ${
          value === "on"
            ? "ACTIVÉ"
            : "DÉSACTIVÉ"
        }`
      );

      break;
    }

    /* ================= AFK ================= */

    case "afk": {

      const reason =
        text ||
        "Aucune raison";

      setAFK(
        sender,
        reason
      );

      await sendText(
        jid,
        `💤 @${jidToNumber(
          sender
        )} est maintenant AFK.

Raison : ${reason}`,
        {
          mentions: [
            sender
          ]
        }
      );

      break;
    }

    /* ================= FANCY ================= */

    case "fancy": {

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}fancy texte`
        );

        break;
      }

      const style =
        Number(
          args[0]
        );

      const input =
        Number.isInteger(
          style
        ) &&
        args.length > 1
          ? args
              .slice(1)
              .join(" ")
          : text;

      const selectedStyle =
        Number.isInteger(
          style
        )
          ? style
          : 0;

      await sendText(
        jid,
        fancy(
          input,
          selectedStyle
        )
      );

      break;
    }

    /* ================= PINTEREST ================= */

    case "pinterest":
    case "pin": {

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}${command} anime`
        );

        break;
      }

      try {

        const results =
          await pinterestSearch(
            text
          );

        for (
          const item of results
        ) {

          const imageUrl =
            item?.image ||
            item?.url ||
            item?.src;

          if (!imageUrl) {
            continue;
          }

          await sendImage(
            jid,
            imageUrl,
            `📌 Pinterest

${text}`
          );
        }

      } catch {

        await sendText(
          jid,
          "❌ Impossible de récupérer les images Pinterest."
        );
      }

      break;
    }

    /* ================= PLAY / SONG ================= */

    case "play":
    case "song": {

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}${command} nom de la musique`
        );

        break;
      }

      try {

        await sendText(
          jid,
          "🔎 Recherche de la musique..."
        );

        const result =
          await youtubeAudio(
            text
          );

        await sendText(
          jid,
          `🎵 ${result.title}

⏳ Envoi de l'audio...`
        );

        await sock.sendMessage(
          jid,
          {
            audio:
              result.buffer,
            mimetype:
              "audio/mpeg",
            fileName:
              `${result.title}.mp3`
          }
        );

      } catch (
        error
      ) {

        await sendText(
          jid,
          `❌ Erreur audio :

${error.message}`
        );
      }

      break;
    }

    /* ================= KIKI ================= */

    case "kiki":

      await sendText(
        jid,
        "😂 Kiki est actuellement en mode ULTRA XMD."
      );

      break;

    /* ================= TAKE ================= */

    case "take": {

      const quoted =
        getQuoted(
          message
        );

      if (!quoted) {
        await sendText(
          jid,
          "❌ Réponds à un sticker."
        );

        break;
      }

      const sticker =
        quoted.stickerMessage;

      if (!sticker) {
        await sendText(
          jid,
          "❌ Le message cité n'est pas un sticker."
        );

        break;
      }

      try {

        const buffer =
          await downloadMedia(
            sticker,
            "sticker"
          );

        await sock.sendMessage(
          jid,
          {
            sticker:
              buffer
          }
        );

        await sendText(
          jid,
          "⏜͡︵🍓 ֺׅຶsαgᧉִ͞͞͞ ղіᥴׄ᥆ֹׅᥣαs ⵿ׄ͡ এ╰︶࣪࣪࣪࣪"
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de récupérer le sticker."
        );
      }

      break;
    }

    /* ================= TOURL ================= */

    case "tourl":

      await sendText(
        jid,
        "🌐 Fonction TOURl prête pour intégration du service d'hébergement."
      );

      break;

    /* ================= SSWEB ================= */

    case "ssweb": {

      if (!text) {
        await sendText(
          jid,
          `Usage : ${PREFIX}ssweb https://site.com`
        );

        break;
      }

      try {

        const api =
          `https://image.thum.io/get/fullpage/${encodeURIComponent(
            text
          )}`;

        await sendImage(
          jid,
          api,
          `🌐 Screenshot

${text}`
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de faire la capture."
        );
      }

      break;
    }

    /* ================= GETPP ================= */

    case "getpp": {

      const target =
        getTargetJid(
          message,
          args
        ) ||
        sender;

      try {

        const url =
          await sock.profilePictureUrl(
            target,
            "image"
          );

        await sendImage(
          jid,
          url,
          `🖼️ Photo de profil de ${jidToNumber(
            target
          )}`
        );

      } catch {

        await sendText(
          jid,
          "❌ Cette personne n'a pas de photo de profil accessible."
        );
      }

      break;
    }

    /* ================= DELETE ================= */

    case "delete": {

      const quoted =
        getContext(
          message
        );

      if (
        !quoted?.stanzaId
      ) {
        await sendText(
          jid,
          "❌ Réponds au message à supprimer."
        );

        break;
      }

      if (
        !(await requireAdmin(
          jid,
          sender
        ))
      ) break;

      try {

        await sock.sendMessage(
          jid,
          {
            delete: {
              remoteJid:
                jid,
              fromMe:
                false,
              id:
                quoted.stanzaId,
              participant:
                quoted.participant
            }
          }
        );

      } catch {

        await sendText(
          jid,
          "❌ Impossible de supprimer ce message."
        );
      }

      break;
    }

    /* ================= THEME ================= */

    case "theme": {

      if (!args[0]) {

        await sendText(
          jid,
          `🎭 THEMES DISPONIBLES

${THEMES.join(
  "\n"
)}

Usage : ${PREFIX}theme naruto`
        );

        break;
      }

      const theme =
        args[0].toLowerCase();

      if (
        !THEMES.includes(
          theme
        )
      ) {

        await sendText(
          jid,
          `❌ Thème inconnu.

${THEMES.join(
  "\n"
)}`
        );

        break;
      }

      if (
        isGroupJid(jid) &&
        !(await requireAdmin(
          jid,
          sender
        ))
      ) {
        break;
      }

      setTheme(
        jid,
        theme
      );

      await sendText(
        jid,
        `🎭 Thème changé : ${theme}`
      );

      break;
    }

    /* ================= COUPLE ================= */

    case "couple":

      await sendText(
        jid,
        `💞 COUPLE DU JOUR

👑 ${OWNER_NAME} ❤️ ???`
      );

      break;

    case "couplepp": {

      const target =
        getTargetJid(
          message,
          args
        );

      if (!target) {

        await sendText(
          jid,
          `Usage : ${PREFIX}couplepp @user`
        );

        break;
      }

      try {

        const url =
          await sock.profilePictureUrl(
            target,
            "image"
          );

        await sendImage(
          jid,
          url,
          "💞 Couple Profile"
        );

      } catch {

        await sendText(
          jid,
          "💞 Couple Profile"
        );
      }

      break;
    }

    /* ================= DEFAULT ================= */

    default:

      await sendText(
        jid,
        `❌ Commande inconnue : ${PREFIX}${command}

Tape ${PREFIX}menu pour voir les commandes.`
      );
  }
}

/* =========================================================
   ANTILINK
========================================================= */

async function handleAntilink(
  message,
  jid,
  sender,
  text
) {
  if (
    !isGroupJid(jid)
  ) {
    return false;
  }

  if (
    !getProtection(
      jid,
      "antilink"
    )
  ) {
    return false;
  }

  if (
    !text ||
    !/(https?:\/\/|chat\.whatsapp\.com\/)/i.test(
      text
    )
  ) {
    return false;
  }

  if (
    isOwner(sender) ||
    (await isAdmin(
      jid,
      sender
    ))
  ) {
    return false;
  }

  try {

    await sock.sendMessage(
      jid,
      {
        delete:
          message.key
      }
    );

  } catch {}

  await sendText(
    jid,
    `🚫 @${jidToNumber(
      sender
    )} lien supprimé.`,
    {
      mentions: [
        sender
      ]
    }
  );

  return true;
}

/* =========================================================
   ANTIPROMOTE
========================================================= */

async function handleParticipantsUpdate(
  update
) {
  const {
    id,
    participants,
    action
  } = update;

  if (
    action !== "promote"
  ) {
    return;
  }

  if (
    !getProtection(
      id,
      "antipromote"
    )
  ) {
    return;
  }

  if (
    !participants?.length
  ) {
    return;
  }

  if (
    !(await isBotAdmin(
      id
    ))
  ) {
    return;
  }

  for (
    const participant of participants
  ) {

    try {

      await sock.groupParticipantsUpdate(
        id,
        [participant],
        "demote"
      );

    } catch {}
  }

  await sendText(
    id,
    "🛡️ Antipromote : promotion annulée."
  );
}

/* =========================================================
   AFK DETECTION
========================================================= */

async function handleAFK(
  jid,
  sender,
  message
) {
  const afk =
    getAFK();

  const mentioned =
    getMentioned(
      message
    );

  for (
    const target of mentioned
  ) {

    if (
      afk[target]
    ) {

      const info =
        afk[target];

      const duration =
        formatDuration(
          Math.floor(
            (
              Date.now() -
              info.time
            ) / 1000
          )
        );

      await sendText(
        jid,
        `💤 @${jidToNumber(
          target
        )} est AFK.

📝 ${info.reason}
⏱️ Depuis : ${duration}`,
        {
          mentions: [
            target
          ]
        }
      );
    }
  }

  if (
    afk[sender]
  ) {

    const info =
      afk[sender];

    clearAFK(
      sender
    );

    await sendText(
      jid,
      `👋 @${jidToNumber(
        sender
      )}, ton AFK est terminé.`,
      {
        mentions: [
          sender
        ]
      }
    );
  }
}

/* =========================================================
   MESSAGE HANDLER
   =========================================================

   IMPORTANT :
   LE COMPTE CONNECTÉ AU BOT PEUT MAINTENANT
   ENVOYER DES COMMANDES LUI-MÊME.

   Exemple :

   .menu
   .alive
   .ping
   .fancy Nicolas
========================================================= */

async function handleMessage(
  message
) {
  try {

    if (
      !message?.message
    ) {
      return;
    }

    /*
      ANCIEN PROBLÈME :

      if (message.key?.fromMe) return;

      Cette ligne empêchait Nicolas d'utiliser
      les commandes depuis le même compte WhatsApp.

      NOUVEAU COMPORTEMENT :
      Les messages "fromMe" sont acceptés uniquement
      s'ils commencent par le préfixe.
    */

    if (
      message.key?.fromMe
    ) {

      const ownText =
        getText(
          message
        );

      /*
        Message normal du compte :
        ignoré.

        Commande du compte :
        traitée.
      */

      if (
        !ownText.startsWith(
          PREFIX
        )
      ) {
        return;
      }
    }

    const jid =
      message.key
        ?.remoteJid;

    if (!jid) {
      return;
    }

    const sender =
      getSenderJid(
        message
      );

    const text =
      getText(
        message
      );

    /*
      AFK
    */

    await handleAFK(
      jid,
      sender,
      message
    );

    /*
      ANTILINK
    */

    if (
      await handleAntilink(
        message,
        jid,
        sender,
        text
      )
    ) {
      return;
    }

    /*
      PARSE COMMAND
    */

    const parsed =
      parseCommand(
        text
      );

    if (!parsed) {
      return;
    }

    /*
      COMMAND
    */

    await handleCommand(
      message,
      jid,
      sender,
      parsed.command,
      parsed.args,
      parsed.text
    );

  } catch (
    error
  ) {

    console.error(
      "❌ Message error:",
      error
    );
  }
}

/* =========================================================
   WELCOME / GOODBYE
========================================================= */

async function handleGroupParticipants(
  update
) {
  try {

    const {
      id,
      participants,
      action
    } = update;

    if (
      !participants?.length
    ) {
      return;
    }

    if (
      action === "add"
    ) {

      for (
        const participant of participants
      ) {

        await sendImage(
          id,
          OFFICIAL_IMAGES.welcome,
          `🎉 Bienvenue @${jidToNumber(
            participant
          )} !

Bienvenue dans le groupe ${BOT_NAME}.`
        );
      }
    }

    if (
      action === "remove"
    ) {

      for (
        const participant of participants
      ) {

        await sendImage(
          id,
          OFFICIAL_IMAGES.goodbye,
          `👋 @${jidToNumber(
            participant
          )} a quitté le groupe.`
        );
      }
    }

    await handleParticipantsUpdate(
      update
    );

  } catch (
    error
  ) {

    console.error(
      "❌ Participant error:",
      error
    );
  }
}

/* =========================================================
   PAIRING CODE
========================================================= */

async function requestPairingCode(
  currentSocket,
  state,
  generation
) {

  if (
    state.creds.registered
  ) {

    console.log(
      "✅ Session WhatsApp déjà enregistrée."
    );

    return;
  }

  if (
    pairingRequested ||
    pairingInProgress
  ) {
    return;
  }

  if (
    generation !==
    botGeneration
  ) {
    return;
  }

  if (
    !currentSocket ||
    currentSocket !==
    sock
  ) {
    return;
  }

  if (
    !OWNER_NUMBER
  ) {

    console.error(
      "❌ PAIRING_NUMBER manquant."
    );

    console.error(
      "➡️ Ajoute PAIRING_NUMBER=242XXXXXXXXX dans Railway Variables."
    );

    return;
  }

  if (
    OWNER_NUMBER.length < 8
  ) {

    console.error(
      "❌ PAIRING_NUMBER invalide."
    );

    return;
  }

  pairingRequested =
    true;

  pairingInProgress =
    true;

  try {

    console.log(
      "🔐 Demande du Pairing Code..."
    );

    console.log(
      `📱 Numéro : ${OWNER_NUMBER}`
    );

    await sleep(
      2500
    );

    if (
      generation !==
      botGeneration
    ) {
      return;
    }

    if (
      state.creds.registered
    ) {
      return;
    }

    const code =
      await currentSocket.requestPairingCode(
        OWNER_NUMBER
      );

    if (!code) {

      throw new Error(
        "WhatsApp n'a retourné aucun code."
      );
    }

    const formatted =
      String(code)
        .replace(
          /[^A-Z0-9]/gi,
          ""
        )
        .match(
          /.{1,4}/g
        )
        ?.join("-") ||
      String(code);

    console.log(
      ""
    );

    console.log(
      "╔══════════════════════════════════╗"
    );

    console.log(
      "║     🔐 PAIRING CODE WHATSAPP     ║"
    );

    console.log(
      "╠══════════════════════════════════╣"
    );

    console.log(
      `║          ${formatted}             ║`
    );

    console.log(
      "╠══════════════════════════════════╣"
    );

    console.log(
      "║ WhatsApp > Appareils connectés   ║"
    );

    console.log(
      "║ > Connecter un appareil           ║"
    );

    console.log(
      "║ > Connecter avec numéro téléphone║"
    );

    console.log(
      "╚══════════════════════════════════╝"
    );

    console.log(
      ""
    );

    console.log(
      "⚠️ N'appelle pas .pair plusieurs fois."
    );

    console.log(
      "⚠️ Utilise ce code une seule fois."
    );

  } catch (
    error
  ) {

    console.error(
      "❌ Erreur Pairing Code :",
      error?.message ||
        error
    );

    console.error(
      "ℹ️ Si WhatsApp affiche encore « code incorrect », supprime l'ancien dossier auth_info_baileys puis redémarre UNE seule fois."
    );

    pairingRequested =
      false;

  } finally {

    pairingInProgress =
      false;
  }
}

/* =========================================================
   CONNECTION
========================================================= */

async function startBot() {

  if (
    starting
  ) {
    return;
  }

  starting =
    true;

  botGeneration++;

  const generation =
    botGeneration;

  try {

    const {
      state,
      saveCreds
    } =
      await useMultiFileAuthState(
        AUTH_DIR
      );

    let version;

    try {

      const waVersion =
        await fetchLatestWaWebVersion();

      if (
        waVersion?.version
      ) {

        version =
          waVersion.version;

        console.log(
          `🌐 WhatsApp Web version : ${version.join(
            "."
          )}`
        );
      }

    } catch (
      error
    ) {

      console.log(
        "⚠️ Impossible de récupérer la version WhatsApp Web, version Baileys par défaut utilisée."
      );
    }

    const socketOptions = {

      auth:
        state,

      logger:
        pino({
          level:
            "silent"
        }),

      printQRInTerminal:
        false,

      browser:
        Browsers.ubuntu(
          "Chrome"
        ),

      generateHighQualityLinkPreview:
        true,

      syncFullHistory:
        false,

      markOnlineOnConnect:
        false,

      connectTimeoutMs:
        120000,

      defaultQueryTimeoutMs:
        60000,

      keepAliveIntervalMs:
        10000
    };

    if (
      version
    ) {
      socketOptions.version =
        version;
    }

    const currentSocket =
      makeWASocket(
        socketOptions
      );

    sock =
      currentSocket;

    /* =====================================================
       CREDENTIALS
    ===================================================== */

    currentSocket.ev.on(
      "creds.update",
      saveCreds
    );

    /* =====================================================
       MESSAGES
    ===================================================== */

    currentSocket.ev.on(
      "messages.upsert",
      async ({
        messages
      }) => {

        for (
          const message of messages
        ) {

          await handleMessage(
            message
          );
        }
      }
    );

    /* =====================================================
       GROUP PARTICIPANTS
    ===================================================== */

    currentSocket.ev.on(
      "group-participants.update",
      handleGroupParticipants
    );

    /* =====================================================
       CONNECTION UPDATE
    ===================================================== */

    currentSocket.ev.on(
      "connection.update",
      async update => {

        const {
          connection,
          lastDisconnect
        } = update;

        /* =================================================
           CONNECTING
        ================================================= */

        if (
          connection ===
          "connecting"
        ) {

          console.log(
            "🔄 Connexion à WhatsApp..."
          );

          if (
            !state.creds.registered &&
            !pairingRequested &&
            generation ===
              botGeneration
          ) {

            requestPairingCode(
              currentSocket,
              state,
              generation
            ).catch(
              error =>
                console.error(
                  "❌ Pairing:",
                  error
                )
            );
          }
        }

        /* =================================================
           OPEN
        ================================================= */

        if (
          connection ===
          "open"
        ) {

          console.log(
            ""
          );

          console.log(
            "╔══════════════════════════════════╗"
          );

          console.log(
            "║   🚀 NICOLAS ULTRA XMD ONLINE   ║"
          );

          console.log(
            "╠══════════════════════════════════╣"
          );

          console.log(
            `║ Version : ${VERSION}`
          );

          console.log(
            "║ Connexion : PAIRING CODE"
          );

          console.log(
            "║ QR Code : DÉSACTIVÉ"
          );

          console.log(
            "╚══════════════════════════════════╝"
          );

          console.log(
            ""
          );

          pairingRequested =
            false;

          pairingInProgress =
            false;
        }

        /* =================================================
           CLOSE
        ================================================= */

        if (
          connection ===
          "close"
        ) {

          const statusCode =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          console.error(
            `❌ Connexion fermée : ${
              statusCode ||
              "inconnue"
            }`
          );

          /* ===============================================
             LOGGED OUT
          =============================================== */

          if (
            statusCode ===
            DisconnectReason.loggedOut
          ) {

            console.error(
              "🚫 Session WhatsApp déconnectée."
            );

            console.error(
              "➡️ Supprime auth_info_baileys puis refais le pairing si nécessaire."
            );

            return;
          }

          /* ===============================================
             PREMIER PAIRING 401
          =============================================== */

          if (
            statusCode === 401 &&
            !state.creds.registered
          ) {

            console.error(
              "⚠️ WhatsApp a fermé la tentative de pairing."
            );

            console.error(
              "⚠️ Aucun nouveau pairing automatique ne sera lancé."
            );

            return;
          }

          /* ===============================================
             RECONNEXION
          =============================================== */

          if (
            !reconnectTimer
          ) {

            const delay =
              statusCode ===
              515
                ? 5000
                : 3000;

            console.log(
              `🔄 Reconnexion dans ${
                delay / 1000
              }s...`
            );

            reconnectTimer =
              setTimeout(
                async () => {

                  reconnectTimer =
                    null;

                  pairingRequested =
                    false;

                  pairingInProgress =
                    false;

                  starting =
                    false;

                  await startBot();

                },
                delay
              );
          }
        }
      }
    );

    /* =====================================================
       SESSION EXISTANTE
    ===================================================== */

    if (
      state.creds.registered
    ) {

      console.log(
        "🔐 Session existante détectée."
      );
    }

  } catch (
    error
  ) {

    console.error(
      "❌ Erreur démarrage :",
      error
    );

    starting =
      false;

    if (
      !reconnectTimer
    ) {

      reconnectTimer =
        setTimeout(
          async () => {

            reconnectTimer =
              null;

            starting =
              false;

            await startBot();

          },
          5000
        );
    }

    return;
  }

  starting =
    false;
}

/* =========================================================
   STARTUP
========================================================= */

console.log(
  ""
);

console.log(
  "╔══════════════════════════════════════╗"
);

console.log(
  "║       NICOLAS ULTRA XMD v3.0.0       ║"
);

console.log(
  "╠══════════════════════════════════════╣"
);

console.log(
  "║ 🔐 CONNEXION : PAIRING CODE ONLY     ║"
);

console.log(
  "║ 🚫 QR CODE : DÉSACTIVÉ                ║"
);

console.log(
  "╚══════════════════════════════════════╝"
);

console.log(
  ""
);

if (
  OWNER_NUMBER
) {

  console.log(
    `📱 Numéro de pairing configuré : ${OWNER_NUMBER}`
  );

} else {

  console.log(
    "⚠️ Aucun PAIRING_NUMBER configuré."
  );
}

console.log(
  ""
);

startBot();

/* =========================================================
   GLOBAL ERRORS
========================================================= */

process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ uncaughtException:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ unhandledRejection:",
      error
    );
  }
);
