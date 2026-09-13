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
// NICOLAS ULTRA XMD
// SHADOW MONARCH ⚔️
// ======================================================

const PREFIX = ".";

const OWNER_NAME = "Nicolas";
const OWNER_NUMBER = "242067904938";
const OWNER_TELEGRAM = "@Sage_ou_Nicolas";
const OWNER_TELEGRAM_LINK = "https://t.me/Sage_ou_Nicolas";

const BOT_NAME = "NICOLAS ULTRA XMD";
const BOT_VERSION = "1.0.0";

const AUTH_DIR = "/app/auth_info_baileys";

// ======================================================
// DOSSIERS
// ======================================================

if (!fs.existsSync("/app")) {
  fs.mkdirSync("/app", { recursive: true });
}

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

// ======================================================
// THEMES
// ======================================================

const themes = {
  solo: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "SHADOW MONARCH",
    footer: "ARISE 🖤⚔️"
  },

  naruto: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "NINJA WORLD 🍥",
    footer: "DATTEBAYO 🧡"
  },

  onepiece: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "GRAND LINE ☠️",
    footer: "I'M GONNA BE KING OF THE PIRATES 🏴‍☠️"
  },

  bleach: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "SOUL SOCIETY ⚔️",
    footer: "BANKAI 🖤"
  },

  demon: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "DEMON SLAYER 🔥",
    footer: "SET YOUR HEART ABLAZE 🔥"
  },

  dragonball: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "DRAGON BALL 🐉",
    footer: "KAMEHAMEHA 💥"
  },

  jujutsu: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "JUJUTSU KAISEN 👁️",
    footer: "DOMAIN EXPANSION 🌀"
  },

  aot: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "ATTACK ON TITAN ⚔️",
    footer: "SHINZOU WO SASAGEYO 🪽"
  },

  hxh: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "HUNTER × HUNTER 🎴",
    footer: "NEN MASTER 👁️"
  },

  blackclover: {
    title: "NICOLAS ULTRA XMD",
    subtitle: "BLACK CLOVER ♣️",
    footer: "NO MAGIC, NO PROBLEM ⚔️"
  }
};

let currentTheme = "solo";

// ======================================================
// COMMANDES
// ======================================================

const commands = {

  GROUP: [
    ".add",
    ".ban",
    ".unban",
    ".antibadword",
    ".antibot",
    ".antilink",
    ".antispam",
    ".antitag",
    ".antipromote",
    ".antidemote",
    ".goodbye",
    ".del",
    ".ppgroup",
    ".groupinfo",
    ".groupname",
    ".kick",
    ".kickall",
    ".left",
    ".link",
    ".listadmin",
    ".mute",
    ".promote",
    ".demote",
    ".purge",
    ".resetlink",
    ".revoke",
    ".setgdesc",
    ".staff",
    ".tag",
    ".tagall",
    ".unmute",
    ".welcome",
    ".setwelcome"
  ],

  FUN: [
    ".8ball",
    ".blague",
    ".character",
    ".coinflip",
    ".compliment",
    ".dare",
    ".fact",
    ".flirt",
    ".gif",
    ".goodnight",
    ".hug",
    ".joke",
    ".kiss",
    ".love",
    ".meme",
    ".news",
    ".quote",
    ".roll",
    ".roseday",
    ".ship",
    ".slap",
    ".stupid",
    ".trivia",
    ".truth",
    ".valentine",
    ".waifu"
  ],

  MEDIA: [
    ".instagram",
    ".video",
    ".apk",
    ".capcut",
    ".facebook",
    ".getstatus",
    ".img",
    ".mediafire",
    ".movie",
    ".pinterest",
    ".wallpapers"
  ],

  GENERAL: [
    ".alive",
    ".antidelete",
    ".channelid",
    ".fancy",
    ".gpstatus",
    ".menu",
    ".owner",
    ".ping",
    ".repo",
    ".voice"
  ],

  AI: [
    ".tts",
    ".ai",
    ".caricature",
    ".chatbot",
    ".imagine",
    ".manga",
    ".pixelart",
    ".gsticker",
    ".traduc"
  ],

  TOOLS: [
    ".attp",
    ".photo",
    ".sticker",
    ".tgs",
    ".take",
    ".textmaker",
    ".url",
    ".kiki"
  ],

  GAMES: [
    ".fast",
    ".guess",
    ".higherlower",
    ".math",
    ".memory",
    ".rps",
    ".word"
  ],

  DOWNLOAD: [
    ".lyrics",
    ".play",
    ".song",
    ".tiktok"
  ],

  SYSTEM: [
    ".allprefix",
    ".botimage",
    ".botname",
    ".delprefix",
    ".online",
    ".prefix",
    ".speed"
  ]
};

// ======================================================
// UTILITAIRES
// ======================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function jidToNumber(jid = "") {
  return jid.split("@")[0].replace(/\D/g, "");
}

function getText(message) {
  const msg = message.message || {};

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    ""
  ).trim();
}

function isGroupJid(jid) {
  return jid && jid.endsWith("@g.us");
}

function escapeText(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function react(sock, jid, messageKey, emoji) {
  try {
    await sock.sendMessage(jid, {
      react: {
        text: emoji,
        key: messageKey
      }
    });
  } catch {}
}

// ======================================================
// MENU
// ======================================================

function buildMenu(themeName = currentTheme) {
  const theme = themes[themeName] || themes.solo;

  let menu = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃      ⚔️ ${theme.title}
┃      👑 ${theme.subtitle}
╰━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━〔 🖤 GENERAL 〕━━━
${commands.GENERAL.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 👥 GROUP 〕━━━
${commands.GROUP.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 😂 FUN 〕━━━
${commands.FUN.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 🖼️ MEDIA 〕━━━
${commands.MEDIA.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 🤖 AI 〕━━━
${commands.AI.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 🛠️ TOOLS 〕━━━
${commands.TOOLS.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 🎮 GAMES 〕━━━
${commands.GAMES.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 📥 DOWNLOAD 〕━━━
${commands.DOWNLOAD.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 ⚙️ SYSTEM 〕━━━
${commands.SYSTEM.join("\n")}
┗━━━━━━━━━━━━━━━━━━━━━━

┏━━━〔 🎨 THEME 〕━━━
.theme solo
.theme naruto
.theme onepiece
.theme bleach
.theme demon
.theme dragonball
.theme jujutsu
.theme aot
.theme hxh
.theme blackclover
.theme random
┗━━━━━━━━━━━━━━━━━━━━━━

${theme.footer}
`;

  return menu.trim();
}

// ======================================================
// ADMIN / GROUPE
// ======================================================

async function getGroupAdmins(sock, jid) {
  const metadata = await sock.groupMetadata(jid);

  return metadata.participants
    .filter(p => p.admin === "admin" || p.admin === "superadmin")
    .map(p => p.id);
}

async function isAdmin(sock, jid, userJid) {
  if (!isGroupJid(jid)) return false;

  try {
    const admins = await getGroupAdmins(sock, jid);
    return admins.includes(userJid);
  } catch {
    return false;
  }
}

async function getTargetJid(message, args) {
  const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  if (mentioned && mentioned.length > 0) {
    return mentioned[0];
  }

  const quoted =
    message.message?.extendedTextMessage?.contextInfo?.participant;

  if (quoted) {
    return quoted;
  }

  const number = args[0]?.replace(/\D/g, "");

  if (number) {
    return `${number}@s.whatsapp.net`;
  }

  return null;
}

// ======================================================
// COMMAND HANDLER
// ======================================================

async function handleCommand(sock, message, command, args) {
  const jid = message.key.remoteJid;
  const sender = message.key.participant || message.key.remoteJid;

  // ---------------- MENU ----------------

  if (command === "menu") {
    const menu = buildMenu();

    const sent = await sock.sendMessage(jid, {
      text: menu
    });

    const reactions = [
      "🎀",
      "🪄",
      "🍫",
      "🎻",
      "🍟",
      "🍎",
      "🧿"
    ];

    for (const emoji of reactions) {
      await sleep(350);
      await react(sock, jid, sent.key, emoji);
    }

    await sleep(350);
    await react(sock, jid, sent.key, "💎");

    return;
  }

  // ---------------- MENU OFFICIEL ----------------

  if (command === "menu" && args[0]?.toLowerCase() === "officiel") {
    return;
  }

  // ---------------- ALIVE ----------------

  if (command === "alive") {
    await sock.sendMessage(jid, {
      text:
        "╭━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃ 🖤 NICOLAS ULTRA XMD\n" +
        "┃ ⚔️ SHADOW MONARCH\n" +
        "┃\n" +
        "┃ ✅ Bot en ligne\n" +
        "┃ ⚡ Système opérationnel\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━╯"
    });
    return;
  }

  // ---------------- PING ----------------

  if (command === "ping") {
    const start = Date.now();

    await sock.sendMessage(jid, {
      text: "🏓 Calcul de la vitesse..."
    });

    const ms = Date.now() - start;

    await sock.sendMessage(jid, {
      text: `🏓 Pong !\n⚡ ${ms} ms`
    });

    return;
  }

  // ---------------- SPEED ----------------

  if (command === "speed") {
    await sock.sendMessage(jid, {
      text: `⚡ Nicolas Ultra XMD\nVitesse : ${Date.now() % 1000} ms`
    });
    return;
  }

  // ---------------- OWNER ----------------

  if (command === "owner") {
    await sock.sendMessage(jid, {
      text:
        "╭━━━━━━━━━━━━━━━━━━━━━━╮\n" +
        "┃ 👑 OWNER\n" +
        "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
        `👤 ${OWNER_NAME}\n` +
        `📱 WhatsApp : +${OWNER_NUMBER}\n` +
        `✈️ Telegram : ${OWNER_TELEGRAM}\n` +
        `🔗 ${OWNER_TELEGRAM_LINK}\n\n` +
        "🖤 Nicolas Ultra XMD"
    });
    return;
  }

  // ---------------- REPO ----------------

  if (command === "repo") {
    await sock.sendMessage(jid, {
      text:
        "🖤 NICOLAS ULTRA XMD\n\n" +
        "⚔️ Shadow Monarch WhatsApp Bot\n" +
        "🤖 AI • Group • Fun • Media • Games\n\n" +
        "Version : " + BOT_VERSION
    });
    return;
  }

  // ---------------- THEME ----------------

  if (command === "theme") {
    const requested = (args[0] || "").toLowerCase();

    if (requested === "random") {
      const names = Object.keys(themes);
      currentTheme = randomItem(names);
    } else if (themes[requested]) {
      currentTheme = requested;
    } else {
      await sock.sendMessage(jid, {
        text:
          "🎨 Thèmes disponibles :\n\n" +
          Object.keys(themes).join("\n")
      });
      return;
    }

    await sock.sendMessage(jid, {
      text:
        `🎨 Thème activé : ${currentTheme}\n\n` +
        buildMenu(currentTheme)
    });

    return;
  }

  // ---------------- KIKI ----------------

  if (command === "kiki") {
    await sock.sendMessage(jid, {
      text:
        "🛠️ KIKI\n\n" +
        "Petit outil de Nicolas Ultra XMD 😈\n" +
        "Le système est prêt."
    });
    return;
  }

  // ---------------- WAIFU ----------------

  if (command === "waifu") {
    try {
      const response = await axios.get(
        "https://api.waifu.pics/sfw/waifu",
        { timeout: 15000 }
      );

      if (response.data?.url) {
        await sock.sendMessage(jid, {
          image: {
            url: response.data.url
          },
          caption: "🌸 Waifu du jour 🖤"
        });
      } else {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de récupérer une waifu."
        });
      }
    } catch {
      await sock.sendMessage(jid, {
        text: "❌ Le service waifu est temporairement indisponible."
      });
    }

    return;
  }

  // ---------------- 8BALL ----------------

  if (command === "8ball") {
    const answers = [
      "Oui 😎",
      "Non ❌",
      "Probablement 👀",
      "Certainement 🔥",
      "J'en doute fortement 💀",
      "Demande encore plus tard 🌀",
      "Les étoiles disent oui ✨",
      "Impossible de savoir 🤔"
    ];

    await sock.sendMessage(jid, {
      text: `🎱 ${randomItem(answers)}`
    });

    return;
  }

  // ---------------- COINFLIP ----------------

  if (command === "coinflip") {
    await sock.sendMessage(jid, {
      text: `🪙 Résultat : ${Math.random() < 0.5 ? "PILE 🪙" : "FACE 🪙"}`
    });
    return;
  }

  // ---------------- ROLL ----------------

  if (command === "roll") {
    const max = Math.max(2, parseInt(args[0]) || 6);
    const result = Math.floor(Math.random() * max) + 1;

    await sock.sendMessage(jid, {
      text: `🎲 ${result} / ${max}`
    });

    return;
  }

  // ---------------- JOKE ----------------

  if (command === "joke" || command === "blague") {
    const jokes = [
      "Pourquoi les développeurs aiment le dark mode ? Parce que la lumière attire les bugs. 💀",
      "Mon code fonctionne parfaitement... jusqu'à ce que quelqu'un le regarde. 😭",
      "J'ai demandé à mon PC de réfléchir. Il a redémarré. 💀"
    ];

    await sock.sendMessage(jid, {
      text: `😂 ${randomItem(jokes)}`
    });

    return;
  }

  // ---------------- COMPLIMENT ----------------

  if (command === "compliment") {
    await sock.sendMessage(jid, {
      text: "😎 T'as une énergie de personnage principal aujourd'hui."
    });
    return;
  }

  // ---------------- FLIRT ----------------

  if (command === "flirt") {
    const lines = [
      "Si le charme était une commande, tu serais `.maxlevel` 😏",
      "Tu viens de faire laguer mon système avec ton style. 😭❤️",
      "Même Shadow Monarch aurait besoin de courage pour t'approcher. 😈"
    ];

    await sock.sendMessage(jid, {
      text: randomItem(lines)
    });
    return;
  }

  // ---------------- LOVE ----------------

  if (command === "love") {
    await sock.sendMessage(jid, {
      text: "❤️ L'amour c'est compliqué... mais ça reste beau."
    });
    return;
  }

  // ---------------- HUG ----------------

  if (command === "hug") {
    await sock.sendMessage(jid, {
      text: "🫂 *Gros câlin virtuel*"
    });
    return;
  }

  // ---------------- KISS ----------------

  if (command === "kiss") {
    await sock.sendMessage(jid, {
      text: "😘 Bisou virtuel envoyé."
    });
    return;
  }

  // ---------------- SLAP ----------------

  if (command === "slap") {
    await sock.sendMessage(jid, {
      text: "👋💥 *PAF* Voilà, c'était gratuit."
    });
    return;
  }

  // ---------------- FACT ----------------

  if (command === "fact") {
    const facts = [
      "🧠 Le cerveau humain contient environ 86 milliards de neurones.",
      "🌊 La majeure partie de la surface terrestre est couverte par les océans.",
      "⚡ La lumière voyage beaucoup plus vite que le son."
    ];

    await sock.sendMessage(jid, {
      text: randomItem(facts)
    });

    return;
  }

  // ---------------- TRUTH ----------------

  if (command === "truth") {
    const truths = [
      "Quelle est ta plus grande peur ? 👀",
      "Qui est la dernière personne à laquelle tu as pensé ? 😏",
      "Quel est ton plus gros secret ? 🤫",
      "Quelle personne te manque actuellement ? ❤️"
    ];

    await sock.sendMessage(jid, {
      text: `🎯 Vérité : ${randomItem(truths)}`
    });

    return;
  }

  // ---------------- DARE ----------------

  if (command === "dare") {
    const dares = [
      "Envoie un message drôle au dernier contact de ta liste 😂",
      "Change ta photo de profil pendant 5 minutes 😭",
      "Dis quelque chose de gentil à quelqu'un ❤️",
      "Envoie simplement : ARISE ⚔️"
    ];

    await sock.sendMessage(jid, {
      text: `🔥 Défi : ${randomItem(dares)}`
    });

    return;
  }

  // ---------------- RPS ----------------

  if (command === "rps") {
    const choices = ["pierre 🪨", "papier 📄", "ciseaux ✂️"];

    await sock.sendMessage(jid, {
      text: `🎮 Nicolas Ultra XMD choisit : ${randomItem(choices)}`
    });

    return;
  }

  // ---------------- MATH ----------------

  if (command === "math") {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;

    await sock.sendMessage(jid, {
      text: `🧮 Combien font ${a} + ${b} ?`
    });

    return;
  }

  // ====================================================
  // COMMANDES GROUPE
  // ====================================================

  if (
    [
      "add",
      "ban",
      "unban",
      "kick",
      "promote",
      "demote",
      "tag",
      "tagall",
      "del",
      "mute",
      "unmute",
      "link",
      "revoke",
      "resetlink",
      "listadmin",
      "staff",
      "groupinfo",
      "groupname",
      "setgdesc",
      "welcome",
      "setwelcome",
      "goodbye"
    ].includes(command)
  ) {
    if (!isGroupJid(jid)) {
      await sock.sendMessage(jid, {
        text: "❌ Cette commande fonctionne uniquement dans un groupe."
      });
      return;
    }

    const admin = await isAdmin(sock, jid, sender);

    // ---------------- ADD ----------------

    if (command === "add") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const number = args[0]?.replace(/\D/g, "");

      if (!number) {
        await sock.sendMessage(jid, {
          text: "Utilisation : .add 242XXXXXXXXX"
        });
        return;
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [`${number}@s.whatsapp.net`],
          "add"
        );

        await sock.sendMessage(jid, {
          text: `✅ ${number} ajouté au groupe.`
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible d'ajouter cette personne."
        });
      }

      return;
    }

    // ---------------- BAN / KICK ----------------

    if (command === "ban" || command === "kick") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const target = await getTargetJid(message, args);

      if (!target) {
        await sock.sendMessage(jid, {
          text: `Utilisation : .${command} @personne`
        });
        return;
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "remove"
        );

        await sock.sendMessage(jid, {
          text: `👢 ${command === "ban" ? "Membre expulsé." : "Membre retiré."}`
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de retirer cette personne."
        });
      }

      return;
    }

    // ---------------- UNBAN ----------------

    if (command === "unban") {
      await sock.sendMessage(jid, {
        text:
          "ℹ️ WhatsApp ne permet pas de réintégrer automatiquement " +
          "une personne expulsée sans l'ajouter à nouveau."
      });

      return;
    }

    // ---------------- PROMOTE ----------------

    if (command === "promote") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const target = await getTargetJid(message, args);

      if (!target) {
        await sock.sendMessage(jid, {
          text: "Utilisation : .promote @personne"
        });
        return;
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "promote"
        );

        await sock.sendMessage(jid, {
          text: "👑 Admin ajouté."
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de promouvoir cette personne."
        });
      }

      return;
    }

    // ---------------- DEMOTE ----------------

    if (command === "demote") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const target = await getTargetJid(message, args);

      if (!target) {
        await sock.sendMessage(jid, {
          text: "Utilisation : .demote @personne"
        });
        return;
      }

      try {
        await sock.groupParticipantsUpdate(
          jid,
          [target],
          "demote"
        );

        await sock.sendMessage(jid, {
          text: "⬇️ Admin retiré."
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de retirer les droits."
        });
      }

      return;
    }

    // ---------------- TAG ----------------

    if (command === "tag" || command === "tagall") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const metadata = await sock.groupMetadata(jid);

      const mentions = metadata.participants.map(
        participant => participant.id
      );

      const text =
        args.length > 0
          ? args.join(" ")
          : "📢 Tous les membres sont convoqués !";

      await sock.sendMessage(jid, {
        text,
        mentions
      });

      return;
    }

    // ---------------- GROUP INFO ----------------

    if (command === "groupinfo") {
      const metadata = await sock.groupMetadata(jid);

      await sock.sendMessage(jid, {
        text:
          "╭━━━━━━━━━━━━━━━━━━━━━━╮\n" +
          "┃ 👥 GROUP INFO\n" +
          "╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n" +
          `📛 Nom : ${metadata.subject}\n` +
          `👤 Membres : ${metadata.participants.length}\n` +
          `🆔 ID : ${jid}`
      });

      return;
    }

    // ---------------- LIST ADMIN ----------------

    if (command === "listadmin" || command === "staff") {
      const metadata = await sock.groupMetadata(jid);

      const admins = metadata.participants
        .filter(p => p.admin)
        .map(p => `• @${jidToNumber(p.id)}`)
        .join("\n");

      const mentions = metadata.participants
        .filter(p => p.admin)
        .map(p => p.id);

      await sock.sendMessage(jid, {
        text: `👑 ADMINS\n\n${admins || "Aucun admin trouvé."}`,
        mentions
      });

      return;
    }

    // ---------------- LINK ----------------

    if (command === "link") {
      try {
        const code = await sock.groupInviteCode(jid);

        await sock.sendMessage(jid, {
          text: `🔗 Lien du groupe :\nhttps://chat.whatsapp.com/${code}`
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de récupérer le lien."
        });
      }

      return;
    }

    // ---------------- REVOKE ----------------

    if (command === "revoke" || command === "resetlink") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      try {
        await sock.groupRevokeInvite(jid);

        await sock.sendMessage(jid, {
          text: "🔄 Nouveau lien du groupe généré."
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de réinitialiser le lien."
        });
      }

      return;
    }

    // ---------------- GROUP NAME ----------------

    if (command === "groupname") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const name = args.join(" ");

      if (!name) {
        await sock.sendMessage(jid, {
          text: "Utilisation : .groupname Nouveau nom"
        });
        return;
      }

      try {
        await sock.groupUpdateSubject(jid, name);

        await sock.sendMessage(jid, {
          text: "✅ Nom du groupe modifié."
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de modifier le nom."
        });
      }

      return;
    }

    // ---------------- SET DESC ----------------

    if (command === "setgdesc") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      const description = args.join(" ");

      if (!description) {
        await sock.sendMessage(jid, {
          text: "Utilisation : .setgdesc nouvelle description"
        });
        return;
      }

      try {
        await sock.groupUpdateDescription(
          jid,
          description
        );

        await sock.sendMessage(jid, {
          text: "✅ Description modifiée."
        });
      } catch {
        await sock.sendMessage(jid, {
          text: "❌ Impossible de modifier la description."
        });
      }

      return;
    }

    // ---------------- LEFT ----------------

    if (command === "left") {
      if (!admin) {
        await sock.sendMessage(jid, {
          text: "❌ Réservé aux admins."
        });
        return;
      }

      await sock.sendMessage(jid, {
        text: "👋 Nicolas Ultra XMD quitte le groupe..."
      });

      await sock.groupLeave(jid);

      return;
    }
  }

  // ---------------- UNKNOWN ----------------

  await sock.sendMessage(jid, {
    text:
      `❌ Commande inconnue : ${PREFIX}${command}\n\n` +
      `Tape ${PREFIX}menu pour voir les commandes.`
  });
}

// ======================================================
// CONNEXION WHATSAPP
// ======================================================

async function startBot() {
  console.log("");
  console.log("╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮");
  console.log("┃  🖤 NICOLAS ULTRA XMD");
  console.log("┃  ⚔️ SHADOW MONARCH");
  console.log("╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯");
  console.log("");

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR);

  const { version } =
    await fetchLatestBaileysVersion();

  const sock = makeWASocket({
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
    ],
    markOnlineOnConnect: false
  });

  // ==================================================
  // PAIRING CODE
  // ==================================================

  if (!sock.authState.creds.registered) {

    const phoneNumber =
      process.env.PAIRING_NUMBER?.trim();

    if (!phoneNumber) {

      console.log("");
      console.log("╭━━━━━━━━━━━━━━━━━━━━━━╮");
      console.log("┃ ❌ PAIRING_NUMBER");
      console.log("┃    MANQUANT");
      console.log("╰━━━━━━━━━━━━━━━━━━━━━━╯");
      console.log("");
      console.log(
        "Ajoute cette variable dans Railway :"
      );
      console.log(
        "PAIRING_NUMBER=242XXXXXXXXX"
      );
      console.log("");
      console.log("⚠️ Format international");
      console.log("⚠️ Sans +");
      console.log("⚠️ Sans espaces");
      console.log("⚠️ Sans tirets");
      console.log("");

    } else {

      const cleanNumber =
        phoneNumber.replace(/\D/g, "");

      console.log("");
      console.log(
        "📱 Numéro de pairing détecté."
      );
      console.log(
        "🔐 Génération du Pairing Code..."
      );
      console.log("");

      setTimeout(async () => {

        try {

          const code =
            await sock.requestPairingCode(
              cleanNumber
            );

          console.log("");
          console.log(
            "╭━━━━━━━━━━━━━━━━━━━━━━╮"
          );
          console.log(
            "┃ 🔥 PAIRING CODE"
          );
          console.log(
            `┃    ${code}`
          );
          console.log(
            "╰━━━━━━━━━━━━━━━━━━━━━━╯"
          );
          console.log("");

          console.log(
            "📱 WhatsApp"
          );
          console.log(
            "➡️ Paramètres"
          );
          console.log(
            "➡️ Appareils connectés"
          );
          console.log(
            "➡️ Connecter un appareil"
          );
          console.log(
            "➡️ Se connecter avec un numéro de téléphone"
          );
          console.log(
            "➡️ Entre le code affiché ci-dessus"
          );
          console.log("");

        } catch (error) {

          console.error("");
          console.error(
            "❌ ERREUR PAIRING CODE"
          );
          console.error(
            error?.message || error
          );
          console.error("");

        }

      }, 5000);
    }
  }

  // ==================================================
  // SAUVEGARDE AUTH
  // ==================================================

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  // ==================================================
  // CONNEXION
  // ==================================================

  sock.ev.on(
    "connection.update",
    async update => {

      const {
        connection,
        lastDisconnect
      } = update;

      if (connection === "open") {

        console.log("");
        console.log(
          "╭━━━━━━━━━━━━━━━━━━━━━━╮"
        );
        console.log(
          "┃ ✅ WHATSAPP CONNECTÉ"
        );
        console.log(
          "┃ 🖤 NICOLAS ULTRA XMD"
        );
        console.log(
          "┃ ⚔️ SHADOW MONARCH"
        );
        console.log(
          "╰━━━━━━━━━━━━━━━━━━━━━━╯"
        );
        console.log("");

      }

      if (connection === "close") {

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log("");
        console.log(
          "❌ Connexion fermée."
        );

        if (
          statusCode !== DisconnectReason.loggedOut
        ) {
          console.log(
            "🔄 Reconnexion..."
          );

          await sleep(5000);

          startBot();

        } else {

          console.log(
            "⚠️ Session déconnectée."
          );
          console.log(
            "➡️ Supprime l'ancienne session si nécessaire."
          );
        }
      }
    }
  );

  // ==================================================
  // MESSAGES
  // ==================================================

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {

      try {

        const message = messages[0];

        if (!message) return;

        if (message.key.fromMe) return;

        const jid =
          message.key.remoteJid;

        if (!jid) return;

        const text =
          getText(message);

        if (!text) return;

        if (!text.startsWith(PREFIX)) {
          return;
        }

        const body =
          text.slice(PREFIX.length).trim();

        if (!body) return;

        const parts =
          body.split(/\s+/);

        const command =
          parts.shift().toLowerCase();

        const args = parts;

        console.log(
          `📩 ${PREFIX}${command}`
        );

        await handleCommand(
          sock,
          message,
          command,
          args
        );

      } catch (error) {

        console.error(
          "❌ Message error:",
          error?.message || error
        );

      }
    }
  );
}

// ======================================================
// START
// ======================================================

process.on(
  "uncaughtException",
  error => {
    console.error(
      "❌ UNCAUGHT EXCEPTION:",
      error
    );
  }
);

process.on(
  "unhandledRejection",
  error => {
    console.error(
      "❌ UNHANDLED REJECTION:",
      error
    );
  }
);

startBot().catch(error => {
  console.error(
    "❌ ERREUR DÉMARRAGE:",
    error
  );

  setTimeout(
    startBot,
    10000
  );
});
