require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// ======================================================
// ⚔️ NICOLAS ULTRA XMD
// 🖤 SHADOW MONARCH / SUNG JIN-WOO
// ======================================================

const PREFIX = ".";

const OWNER_NAME = "Nicolas";
const OWNER_PHONE = "+242067904938";
const OWNER_TELEGRAM = "@Sage_ou_Nicolas";
const OWNER_TELEGRAM_LINK = "https://t.me/Sage_ou_Nicolas";

// ======================================================
// 📋 COMMANDES
// ======================================================

const COMMANDS = {
  GROUP: [
    "add", "ban", "unban", "antibadword", "antibot",
    "antilink", "antispam", "antitag", "antipromote",
    "antidemote", "goodbye", "del", "ppgroup",
    "groupinfo", "groupname", "kick", "kickall", "left",
    "link", "listadmin", "mute", "promote", "demote",
    "purge", "resetlink", "revoke", "setgdesc", "staff",
    "tag", "tagall", "unmute", "welcome", "setwelcome"
  ],

  FUN: [
    "8ball", "blague", "character", "coinflip", "compliment",
    "dare", "fact", "flirt", "gif", "goodnight", "hug",
    "joke", "kiss", "love", "meme", "news", "quote",
    "roll", "roseday", "ship", "slap", "stupid", "trivia",
    "truth", "valentine", "waifu"
  ],

  MEDIA: [
    "instagram", "video", "apk", "capcut", "facebook",
    "getstatus", "img", "mediafire", "movie", "pinterest",
    "wallpapers"
  ],

  GENERAL: [
    "alive", "antidelete", "channelid", "fancy", "gpstatus",
    "menu", "owner", "ping", "repo", "voice"
  ],

  AI: [
    "tts", "ai", "caricature", "chatbot", "imagine",
    "manga", "pixelart", "gsticker", "traduc"
  ],

  TOOLS: [
    "attp", "photo", "sticker", "tgs", "take",
    "textmaker", "url", "kiki"
  ],

  GAMES: [
    "fast", "guess", "higherlower", "math",
    "memory", "rps", "word"
  ],

  DOWNLOAD: [
    "lyrics", "play", "song", "tiktok"
  ],

  SYSTEM: [
    "allprefix", "botimage", "botname", "delprefix",
    "online", "prefix", "speed"
  ]
};

// ======================================================
// 🎨 POLICES
// ======================================================

const FONTS = {
  normal: text => text,

  bold: text =>
    text.replace(/[A-Za-z]/g, c =>
      String.fromCodePoint(
        c >= "A" && c <= "Z"
          ? 0x1D400 + c.charCodeAt(0) - 65
          : 0x1D41A + c.charCodeAt(0) - 97
      )
    ),

  italic: text => text,

  double: text =>
    text.replace(/[A-Za-z]/g, c =>
      String.fromCodePoint(
        c >= "A" && c <= "Z"
          ? 0x1D538 + c.charCodeAt(0) - 65
          : 0x1D552 + c.charCodeAt(0) - 97
      )
    )
};

function randomFont(text) {
  const fonts = Object.values(FONTS);
  return fonts[Math.floor(Math.random() * fonts.length)](text);
}

// ======================================================
// 🖤 THEMES
// ======================================================

const THEMES = {
  solo: {
    emoji: "🖤",
    symbol: "𓆩",
    title: "NICOLAS ULTRA XMD",
    subtitle: "SHADOW MONARCH",
    footer: "ARISE 🖤⚔️"
  },

  naruto: {
    emoji: "🍥",
    symbol: "〘",
    title: "NARUTO XMD",
    subtitle: "SHINOBI MODE",
    footer: "DATTEBAYO 🍥"
  },

  onepiece: {
    emoji: "🏴‍☠️",
    symbol: "〘",
    title: "ONE PIECE XMD",
    subtitle: "PIRATE MODE",
    footer: "NAKAMA ☠️"
  },

  bleach: {
    emoji: "⚔️",
    symbol: "〘",
    title: "BLEACH XMD",
    subtitle: "BANKAI MODE",
    footer: "BANKAI ⚔️"
  },

  demon: {
    emoji: "🔥",
    symbol: "〘",
    title: "DEMON SLAYER XMD",
    subtitle: "BREATHING MODE",
    footer: "TOTAL CONCENTRATION 🔥"
  },

  dragonball: {
    emoji: "🐉",
    symbol: "〘",
    title: "DRAGON BALL XMD",
    subtitle: "SAIYAN MODE",
    footer: "PLUS ULTRA 🐉"
  },

  jujutsu: {
    emoji: "👁️",
    symbol: "〘",
    title: "JUJUTSU XMD",
    subtitle: "CURSED MODE",
    footer: "DOMAIN EXPANSION 👁️"
  },

  aot: {
    emoji: "⚔️",
    symbol: "〘",
    title: "AOT XMD",
    subtitle: "SCOUT MODE",
    footer: "SHINZOU WO SASAGEYO ⚔️"
  },

  hxh: {
    emoji: "🎴",
    symbol: "〘",
    title: "HUNTER X HUNTER XMD",
    subtitle: "HUNTER MODE",
    footer: "NEN MODE 🎴"
  },

  blackclover: {
    emoji: "♣️",
    symbol: "〘",
    title: "BLACK CLOVER XMD",
    subtitle: "MAGIC MODE",
    footer: "ASTA ♣️"
  }
};

// ======================================================
// 📦 MENU
// ======================================================

function category(title, commands) {
  return `
╭━━〔 ${title} 〕━━╮
${commands.map(cmd => `┃ ✦ ${PREFIX}${cmd}`).join("\n")}
╰━━━━━━━━━━━━━━━━╯
`;
}

function createMenu(themeName = "solo") {
  const theme = THEMES[themeName] || THEMES.solo;

  let menu = `
╭━━━┈┈┈┈┈┈┈┈┈┈━━━╮
       ${theme.symbol} ${randomFont(theme.title)} ${theme.emoji}
       ${randomFont(theme.subtitle)}
╰━━━┈┈┈┈┈┈┈┈┈┈━━━╯

𖤐 𝐏𝐑𝐄𝐅𝐈𝐗 : ${PREFIX}
𖤐 𝐎𝐖𝐍𝐄𝐑 : ${OWNER_NAME}
𖤐 𝐌𝐎𝐃𝐄 : ${theme.footer}

`;

  menu += category("👥 GROUP", COMMANDS.GROUP);
  menu += category("🎭 FUN", COMMANDS.FUN);
  menu += category("🎬 MEDIA", COMMANDS.MEDIA);
  menu += category("⚙️ GENERAL", COMMANDS.GENERAL);
  menu += category("🤖 AI", COMMANDS.AI);
  menu += category("🛠️ TOOLS", COMMANDS.TOOLS);
  menu += category("🎮 GAMES", COMMANDS.GAMES);
  menu += category("⬇️ DOWNLOAD", COMMANDS.DOWNLOAD);
  menu += category("⚙️ SYSTEM", COMMANDS.SYSTEM);

  menu += `
╭━━━〔 🖤 SHADOW MONARCH 〕━━━╮
┃
┃ 𖤐 Nicolas Ultra XMD
┃ 𖤐 Sung Jin-Woo Edition
┃
╰━━━━━━━━━━━━━━━━━━━━╯

        🍫🎻
`;

  return menu;
}

// ======================================================
// 💎 RÉACTIONS MENU
// ======================================================

const MENU_REACTIONS = [
  "🎀",
  "🪄",
  "🍫",
  "🎻",
  "🍟",
  "🍎",
  "🧿"
];

async function reactMenu(sock, jid, messageKey) {
  for (const emoji of MENU_REACTIONS) {
    try {
      await sock.sendMessage(jid, {
        react: {
          text: emoji,
          key: messageKey
        }
      });

      await new Promise(resolve =>
        setTimeout(resolve, 350)
      );

    } catch (error) {
      console.log("Reaction error:", error.message);
    }
  }

  try {
    await sock.sendMessage(jid, {
      react: {
        text: "💎",
        key: messageKey
      }
    });
  } catch (error) {
    console.log("Final reaction error:", error.message);
  }
}

// ======================================================
// 👑 OWNER
// ======================================================

async function sendOwner(sock, jid) {
  return sock.sendMessage(jid, {
    text: `
╭━━━〔 👑 𝐎𝐖𝐍𝐄𝐑 〕━━━╮
┃
┃ 👑 𝐍𝐢𝐜𝐨𝐥𝐚𝐬
┃ 📱 WhatsApp : ${OWNER_PHONE}
┃ ✈️ Telegram : ${OWNER_TELEGRAM}
┃ 🔗 ${OWNER_TELEGRAM_LINK}
┃
╰━━━━━━━━━━━━━━━━━━╯

       🖤⚔️
    𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐎𝐍𝐀𝐑𝐂𝐇
`
  });
}

// ======================================================
// 👥 GROUP
// ======================================================

async function getGroupMetadata(sock, jid) {
  return await sock.groupMetadata(jid);
}

function isAdmin(participant, metadata) {
  const user = metadata.participants.find(
    p => p.id === participant
  );

  return !!(
    user &&
    (user.admin === "admin" ||
     user.admin === "superadmin")
  );
}

async function requireAdmin(sock, jid, sender) {
  if (!jid.endsWith("@g.us")) {
    await sock.sendMessage(jid, {
      text: "❌ Cette commande fonctionne uniquement dans un groupe."
    });

    return false;
  }

  const metadata =
    await getGroupMetadata(sock, jid);

  if (!isAdmin(sender, metadata)) {
    await sock.sendMessage(jid, {
      text: "🚫 Seuls les admins peuvent utiliser cette commande."
    });

    return false;
  }

  return true;
}

function extractTarget(message) {
  const context =
    message.message?.extendedTextMessage?.contextInfo;

  if (context?.mentionedJid?.length) {
    return context.mentionedJid[0];
  }

  if (context?.participant) {
    return context.participant;
  }

  return null;
}

// ======================================================
// 🔨 BAN
// ======================================================

async function banUser(sock, jid, sender, message) {
  if (!await requireAdmin(sock, jid, sender)) {
    return;
  }

  const target = extractTarget(message);

  if (!target) {
    return sock.sendMessage(jid, {
      text: `❌ Mentionne quelqu'un ou réponds à son message.\n\nExemple : ${PREFIX}ban @user`
    });
  }

  try {
    await sock.groupParticipantsUpdate(
      jid,
      [target],
      "remove"
    );

    await sock.sendMessage(jid, {
      text: `
╭━━〔 🔨 BAN 〕━━╮
┃
┃ 👤 Utilisateur expulsé.
┃
╰━━━━━━━━━━━━━━╯
🖤⚔️
`
    });

  } catch (error) {
    console.log("BAN ERROR:", error);

    await sock.sendMessage(jid, {
      text: "❌ Impossible de bannir cet utilisateur. Vérifie que le bot est admin."
    });
  }
}

// ======================================================
// 🔓 UNBAN
// ======================================================

async function unbanUser(sock, jid, sender, message) {
  if (!await requireAdmin(sock, jid, sender)) {
    return;
  }

  const target = extractTarget(message);

  if (!target) {
    return sock.sendMessage(jid, {
      text: "❌ Mentionne l'utilisateur à débannir ou réponds à son message."
    });
  }

  return sock.sendMessage(jid, {
    text: `
╭━━〔 🔓 UNBAN 〕━━╮
┃
┃ Le système de ban a été retiré.
┃
╰━━━━━━━━━━━━━━━━╯
`
  });
}

// ======================================================
// 😂 FUN
// ======================================================

const jokes = [
  "Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tombent dans le bateau 😂",
  "Mon téléphone connaît mieux ma vie que moi 😭",
  "J'ai voulu faire du sport... puis j'ai changé d'avis 😹",
  "Le lundi devrait être illégal 💀"
];

const facts = [
  "Les pieuvres ont trois cœurs 🐙",
  "Une journée sur Vénus est plus longue que son année ☀️",
  "Les bananes sont des baies selon la botanique 🍌",
  "Les requins existent depuis plus longtemps que les arbres 🦈"
];

async function handleFun(sock, jid, command) {
  if (command === ".blague" || command === ".joke") {
    return sock.sendMessage(jid, {
      text: jokes[
        Math.floor(Math.random() * jokes.length)
      ]
    });
  }

  if (command === ".fact") {
    return sock.sendMessage(jid, {
      text: facts[
        Math.floor(Math.random() * facts.length)
      ]
    });
  }

  if (command === ".coinflip") {
    return sock.sendMessage(jid, {
      text: Math.random() > 0.5
        ? "🪙 PILE !"
        : "🪙 FACE !"
    });
  }

  if (command === ".roll") {
    return sock.sendMessage(jid, {
      text: `🎲 Tu as obtenu : ${
        Math.floor(Math.random() * 6) + 1
      }`
    });
  }

  if (command === ".8ball") {
    const answers = [
      "Oui.",
      "Non.",
      "Peut-être.",
      "Très probablement.",
      "Demande à Jin-Woo 😭",
      "Les ombres savent déjà. 🖤"
    ];

    return sock.sendMessage(jid, {
      text:
        `🎱 ${
          answers[
            Math.floor(Math.random() * answers.length)
          ]
        }`
    });
  }
}

// ======================================================
// 🫠 WAIFU
// ======================================================

async function sendWaifu(sock, jid) {
  try {
    const response =
      await axios.get(
        "https://api.waifu.pics/sfw/waifu"
      );

    const imageUrl =
      response.data.url;

    return sock.sendMessage(jid, {
      image: {
        url: imageUrl
      },

      caption: `
╭━━━〔 🖤 𝐖𝐀𝐈𝐅𝐔 〕━━━╮
┃
┃ 🫠❤️‍🔥 Voici ta waifu...
┃
╰━━━━━━━━━━━━━━━━━━╯

🍫🎻
`
    });

  } catch (error) {
    console.log("WAIFU ERROR:", error);

    return sock.sendMessage(jid, {
      text: "😭 La waifu est partie se cacher..."
    });
  }
}

// ======================================================
// ⚙️ GENERAL
// ======================================================

async function handleGeneral(sock, jid, command) {
  switch (command) {

    case ".alive":
      return sock.sendMessage(jid, {
        text: `
🖤 𝐍𝐈𝐂𝐎𝐋𝐀𝐒 𝐔𝐋𝐓𝐑𝐀 𝐗𝐌𝐃

⚔️ Shadow Monarch online.
🔥 Système opérationnel.
🧿 Prêt à exécuter les ordres.

🍫🎻
`
      });

    case ".ping":
      return sock.sendMessage(jid, {
        text: "🏓 Pong ! Nicolas Ultra XMD est vivant 🖤"
      });

    case ".speed":
      return sock.sendMessage(jid, {
        text: `⚡ Speed : ${Date.now()} ms`
      });

    case ".prefix":
      return sock.sendMessage(jid, {
        text: `⚙️ Prefix actuel : ${PREFIX}`
      });

    case ".repo":
      return sock.sendMessage(jid, {
        text: "🖤 Nicolas Ultra XMD — Shadow Monarch Edition"
      });

    case ".owner":
      return sendOwner(sock, jid);
  }
}

// ======================================================
// 🎨 THEMES
// ======================================================

async function handleTheme(sock, jid, args) {
  const requested =
    args[0]?.toLowerCase();

  if (!requested) {
    return sock.sendMessage(jid, {
      text: `
🎨 𝐓𝐇𝐄𝐌𝐄𝐒

🖤 .theme solo
🍥 .theme naruto
🏴‍☠️ .theme onepiece
⚔️ .theme bleach
🔥 .theme demon
🐉 .theme dragonball
👁️ .theme jujutsu
⚔️ .theme aot
🎴 .theme hxh
♣️ .theme blackclover

🎲 .theme random
`
    });
  }

  if (requested === "random") {
    const names =
      Object.keys(THEMES);

    const random =
      names[
        Math.floor(Math.random() * names.length)
      ];

    return sock.sendMessage(jid, {
      text: createMenu(random)
    });
  }

  if (!THEMES[requested]) {
    return sock.sendMessage(jid, {
      text: "❌ Thème inconnu."
    });
  }

  return sock.sendMessage(jid, {
    text: createMenu(requested)
  });
}

// ======================================================
// 🎵 MENU OFFICIEL
// ======================================================

async function sendOfficialMenu(sock, jid) {

  const sentMenu =
    await sock.sendMessage(jid, {
      text: createMenu("solo")
    });

  await reactMenu(
    sock,
    jid,
    sentMenu.key
  );

  const audioPath =
    path.join(
      __dirname,
      "media",
      "sem-demora.mp3"
    );

  if (!fs.existsSync(audioPath)) {
    return sock.sendMessage(jid, {
      text: `
⚠️ Menu officiel envoyé.

🎵 Ajoute ton fichier audio :
media/sem-demora.mp3

pour activer la musique.
`
    });
  }

  return sock.sendMessage(jid, {
    audio: {
      url: audioPath
    },

    mimetype: "audio/mpeg",
    ptt: false
  });
}

// ======================================================
// 🧰 KIKI
// ======================================================

async function handleKiki(sock, jid) {
  return sock.sendMessage(jid, {
    text: `
╭━━〔 🧰 KIKI 〕━━╮
┃
┃ 🛠️ Outil Nicolas Ultra XMD
┃ ⚔️ Shadow Monarch System
┃
╰━━━━━━━━━━━━━━╯
`
  });
}

// ======================================================
// 📱 MESSAGE ROUTER
// ======================================================

async function handleMessage(sock, msg) {

  try {

    if (!msg.message) return;

    const jid =
      msg.key.remoteJid;

    if (!jid) return;

    const messageText =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (!messageText.startsWith(PREFIX)) {
      return;
    }

    const parts =
      messageText.trim().split(/\s+/);

    const command =
      parts[0].toLowerCase();

    const args =
      parts.slice(1);

    const sender =
      msg.key.participant ||
      msg.key.remoteJid;

    // ================================================
    // 📖 MENU
    // ================================================

    if (command === ".menu") {

      if (
        args[0]?.toLowerCase() ===
        "officiel"
      ) {
        return sendOfficialMenu(
          sock,
          jid
        );
      }

      const sentMenu =
        await sock.sendMessage(jid, {
          text: createMenu("solo")
        });

      await reactMenu(
        sock,
        jid,
        sentMenu.key
      );

      return;
    }

    // ================================================
    // 🎨 THEME
    // ================================================

    if (command === ".theme") {
      return handleTheme(
        sock,
        jid,
        args
      );
    }

    // ================================================
    // 🔨 BAN
    // ================================================

    if (command === ".ban") {
      return banUser(
        sock,
        jid,
        sender,
        msg
      );
    }

    // ================================================
    // 🔓 UNBAN
    // ================================================

    if (command === ".unban") {
      return unbanUser(
        sock,
        jid,
        sender,
        msg
      );
    }

    // ================================================
    // 🖤 WAIFU
    // ================================================

    if (command === ".waifu") {
      return sendWaifu(
        sock,
        jid
      );
    }

    // ================================================
    // 🧰 KIKI
    // ================================================

    if (command === ".kiki") {
      return handleKiki(
        sock,
        jid
      );
    }

    // ================================================
    // ⚙️ GENERAL
    // ================================================

    if (
      [
        ".alive",
        ".ping",
        ".speed",
        ".prefix",
        ".repo",
        ".owner"
      ].includes(command)
    ) {
      return handleGeneral(
        sock,
        jid,
        command
      );
    }

    // ================================================
    // 🎭 FUN
    // ================================================

    if (
      [
        ".blague",
        ".joke",
        ".fact",
        ".coinflip",
        ".roll",
        ".8ball"
      ].includes(command)
    ) {
      return handleFun(
        sock,
        jid,
        command
      );
    }

    // ================================================
    // 🧩 TGS
    // ================================================

    if (command === ".tgs") {
      return sock.sendMessage(jid, {
        text: `
🧩 𝐓𝐆𝐒 𝐌𝐎𝐃𝐄

Le système TGS est prévu pour
Telegram → WhatsApp.

⚠️ Le moteur de conversion TGS → WebP
doit encore être installé sur Railway.
`
      });
    }

  } catch (error) {
    console.error(
      "MESSAGE ERROR:",
      error
    );
  }
}

// ======================================================
// 🚀 DÉMARRAGE + PAIRING CODE
// ======================================================

async function startBot() {

  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    "/app/auth_info_baileys"
  );

  const {
    version
  } = await fetchLatestBaileysVersion();

  const sock =
    makeWASocket({

      version,

      auth: state,

      logger: pino({
        level: "silent"
      }),

      printQRInTerminal: false,

      browser: [
        "Nicolas Ultra XMD",
        "Chrome",
        "1.0.0"
      ]
    });

  // ================================================
  // 💾 SAUVEGARDE SESSION
  // ================================================

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  // ================================================
  // 🔐 PAIRING CODE
  // ================================================

  if (!sock.authState.creds.registered) {

    const phoneNumber =
      process.env.PAIRING_NUMBER;

    if (!phoneNumber) {

      console.log(`
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ ❌ PAIRING_NUMBER
┃    MANQUANT
╰━━━━━━━━━━━━━━━━━━━━━━╯

Ajoute cette variable dans Railway :

PAIRING_NUMBER=242XXXXXXXXX

⚠️ Format international
⚠️ Sans +
⚠️ Sans espaces
⚠️ Sans tirets
`);

    } else {

      const cleanNumber =
        phoneNumber.replace(
          /[^0-9]/g,
          ""
        );

      setTimeout(
        async () => {

          try {

            const code =
              await sock.requestPairingCode(
                cleanNumber
              );

            console.log(`
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃
┃ 🔐 NICOLAS ULTRA XMD
┃
┃ ⚔️ SHADOW MONARCH
┃
┃ 🔑 PAIRING CODE :
┃
┃     ${code}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📱 WhatsApp :
Paramètres
→ Appareils connectés
→ Connecter un appareil
→ Connecter avec un numéro
`);

          } catch (error) {

            console.error(
              "❌ PAIRING CODE ERROR:",
              error
            );

          }

        },
        3000
      );
    }
  }

  // ================================================
  // 🔌 CONNEXION
  // ================================================

  sock.ev.on(
    "connection.update",
    async ({
      connection,
      lastDisconnect
    }) => {

      if (connection === "open") {

        console.log(`
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃ 🖤 NICOLAS ULTRA XMD
┃ ⚔️ SHADOW MONARCH
┃
┃ ✅ BOT CONNECTÉ
╰━━━━━━━━━━━━━━━━━━━━━━╯
`);

      }

      if (connection === "close") {

        const shouldReconnect =
          lastDisconnect
            ?.error
            ?.output
            ?.statusCode !==
          DisconnectReason.loggedOut;

        console.log(
          "❌ Connexion fermée."
        );

        if (shouldReconnect) {

          console.log(
            "🔄 Reconnexion..."
          );

          startBot();

        } else {

          console.log(
            "⚠️ Session déconnectée. Re-pairing nécessaire."
          );

        }
      }
    }
  );

  // ================================================
  // 💬 MESSAGES
  // ================================================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

      const msg =
        messages[0];

      if (!msg) return;

      await handleMessage(
        sock,
        msg
      );

    }
  );
}

// ======================================================
// 🚀 START
// ======================================================

startBot();
