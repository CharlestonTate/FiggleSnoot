/**
 * Blocks profanity in display names and email addresses (local part + domain).
 */

const PROFANITY_ERROR = 'That contains inappropriate language.';
const NAME_SPACE_ERROR = 'Display names cannot contain spaces.';
const NAME_CHARS_ERROR = 'Display names can only use letters and numbers.';

const BLOCKED_TERMS = [
  'Anus', 'Arse', 'Arsehole', 'Ass', 'Ass-hat', 'Ass-jabber', 'Ass-pirate', 'Assbag',
  'Assbandit', 'Assbanger', 'Assbite', 'Assclown', 'Asscock', 'Asscracker', 'Asses',
  'Assface', 'Assfuck', 'Assfucker', 'Assgoblin', 'Asshat', 'Asshead', 'Asshole',
  'Asshopper', 'Assjacker', 'Asslick', 'Asslicker', 'Assmonkey', 'Assmunch', 'Assmuncher',
  'Assnigger', 'Asspirate', 'Assshit', 'Assshole', 'Asssucker', 'Asswad', 'Asswipe',
  'Axwound', 'Bampot', 'Bastard', 'Beaner', 'Bitch', 'Bitchass', 'Bitches', 'Bitchtits',
  'Bitchy', 'Blow job', 'Blowjob', 'Bollocks', 'Bollox', 'Boner', 'Brotherfucker',
  'Bullshit', 'Bumblefuck', 'Butt plug', 'Butt-pirate', 'Buttfucka', 'Buttfucker',
  'Camel toe', 'Carpetmuncher', 'Chesticle', 'Chinc', 'Chink', 'Choad', 'Chode', 'Clit',
  'Clitface', 'Clitfuck', 'Clusterfuck', 'Cock', 'Cockass', 'Cockbite', 'Cockburger',
  'Cockface', 'Cockfucker', 'Cockhead', 'Cockjockey', 'Cockknoker', 'Cockmaster',
  'Cockmongler', 'Cockmongruel', 'Cockmonkey', 'Cockmuncher', 'Cocknose', 'Cocknugget',
  'Cockshit', 'Cocksmith', 'Cocksmoke', 'Cocksmoker', 'Cocksniffer', 'Cocksucker',
  'Cockwaffle', 'Coochie', 'Coochy', 'Coon', 'Cooter', 'Cracker', 'Cum', 'Cumbubble',
  'Cumdumpster', 'Cumguzzler', 'Cumjockey', 'Cumslut', 'Cumtart', 'Cunnie', 'Cunnilingus',
  'Cunt', 'Cuntass', 'Cuntface', 'Cunthole', 'Cuntlicker', 'Cuntrag', 'Cuntslut', 'Dago',
  'Damn', 'Deggo', 'Dick', 'Dick-sneeze', 'Dickbag', 'Dickbeaters', 'Dickface', 'Dickfuck',
  'Dickfucker', 'Dickhead', 'Dickhole', 'Dickjuice', 'Dickmilk', 'Dickmonger', 'Dicks',
  'Dickslap', 'Dicksucker', 'Dicksucking', 'Dicktickler', 'Dickwad', 'Dickweasel',
  'Dickweed', 'Dickwod', 'Dike', 'Dildo', 'Dipshit', 'Doochbag', 'Dookie', 'Douche',
  'Douche-fag', 'Douchebag', 'Douchewaffle', 'Dumass', 'Dumb ass', 'Dumbass', 'Dumbfuck',
  'Dumbshit', 'Dumshit', 'Dyke', 'Fag', 'Fagbag', 'Fagfucker', 'Faggit', 'Faggot',
  'Faggotcock', 'Fagtard', 'Fatass', 'Fellatio', 'Feltch', 'Flamer', 'Fuck', 'Fuckass',
  'Fuckbag', 'Fuckboy', 'Fuckbrain', 'Fuckbutt', 'Fuckbutter', 'Fucked', 'Fucker',
  'Fuckersucker', 'Fuckface', 'Fuckhead', 'Fuckhole', 'Fuckin', 'Fucking', 'Fucknut',
  'Fucknutt', 'Fuckoff', 'Fucks', 'Fuckstick', 'Fucktard', 'Fucktart', 'Fuckup', 'Fuckwad',
  'Fuckwit', 'Fuckwitt', 'Fudgepacker', 'Gay', 'Gayass', 'Gaybob', 'Gaydo', 'Gayfuck',
  'Gayfuckist', 'Gaylord', 'Gaytard', 'Gaywad', 'Goddamn', 'Goddamnit', 'Gooch', 'Gook',
  'Gringo', 'Guido', 'Handjob', 'Hard on', 'Heeb', 'Hell', 'Ho', 'Hoe', 'Homo',
  'Homodumbshit', 'Honkey', 'Humping', 'Jackass', 'Jagoff', 'Jap', 'Jerk off', 'Jerkass',
  'Jigaboo', 'Jizz', 'Jungle bunny', 'Junglebunny', 'Kike', 'Kooch', 'Kootch', 'Kraut',
  'Kunt', 'Kyke', 'Lameass', 'Lardass', 'Lesbian', 'Lesbo', 'Lezzie', 'Mcfagget', 'Mick',
  'Minge', 'Mothafucka', "Mothafuckin'", 'Motherfucker', 'Motherfucking', 'Muff', 'Muffdiver',
  'Munging', 'Negro', 'Nigaboo', 'Nigga', 'Nigger', 'Niggers', 'Niglet', 'Nut sack',
  'Nutsack', 'Paki', 'Panooch', 'Pecker', 'Peckerhead', 'Penis', 'Penisbanger',
  'Penisfucker', 'Penispuffer', 'Piss', 'Pissed', 'Pissed off', 'Pissflaps', 'Polesmoker',
  'Pollock', 'Poon', 'Poonani', 'Poonany', 'Poontang', 'Porch monkey', 'Porchmonkey',
  'Prick', 'Punanny', 'Punta', 'Pussies', 'Pussy', 'Pussylicking', 'Puto', 'Queef', 'Queer',
  'Queerbait', 'Queerhole', 'Renob', 'Rimjob', 'Ruski', 'Sand nigger', 'Sandnigger',
  'Schlong', 'Scrote', 'Shit', 'Shitass', 'Shitbag', 'Shitbagger', 'Shitbrains',
  'Shitbreath', 'Shitcanned', 'Shitcunt', 'Shitdick', 'Shitface', 'Shitfaced', 'Shithead',
  'Shithole', 'Shithouse', 'Shitspitter', 'Shitstain', 'Shitter', 'Shittiest', 'Shitting',
  'Shitty', 'Shiz', 'Shiznit', 'Skank', 'Skeet', 'Skullfuck', 'Slut', 'Slutbag', 'Smeg',
  'Snatch', 'Spic', 'Spick', 'Splooge', 'Spook', 'Suckass', 'Tard', 'Testicle',
  'Thundercunt', 'Tit', 'Titfuck', 'Tits', 'Tittyfuck', 'Twat', 'Twatlips', 'Twats',
  'Twatwaffle', 'Unclefucker', 'Va-j-j', 'Vag', 'Vagina', 'Vajayjay', 'Vjayjay', 'Wank',
  'Wankjob', 'Wetback', 'Whore', 'Whorebag', 'Whoreface', 'Wop',
];

function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7+]/g, 't');
}

function compactText(text) {
  return normalizeText(text).replace(/[^a-z0-9]/g, '');
}

function tokenize(text) {
  return normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);
}

const NORMALIZED_TERMS = [...new Set(
  BLOCKED_TERMS.map((term) => compactText(term)).filter((term) => term.length > 0),
)].sort((a, b) => b.length - a.length);

function textMatchesTerm(text, term) {
  if (!term) return false;

  const compact = compactText(text);
  const tokens = tokenize(text);

  if (tokens.includes(term) || compact === term) return true;

  // Spaced or symbol-separated evasions: "fuc k", "f.u.c.k", "f-u-c-k"
  if (term.length >= 4 && compact.includes(term)) return true;

  if (term.length >= 5 && tokens.some((token) => token.includes(term))) return true;

  if (term.length === 4) {
    return tokens.some((token) => token.length >= 4 && token.includes(term));
  }

  return false;
}

/** Stricter matching for display names (single token, no spaces). */
function nameMatchesTerm(name, term) {
  if (!term) return false;
  const compact = compactText(name);
  if (!compact) return false;
  if (compact === term) return true;
  if (term.length >= 3 && compact.includes(term)) return true;
  return false;
}

export function hasInvalidDisplayNameFormat(name) {
  const value = String(name ?? '');
  if (/\s/.test(value)) return 'space';
  if (value && !/^[a-zA-Z0-9]+$/.test(value)) return 'chars';
  return null;
}

export function containsProfanity(text) {
  if (!text) return false;
  return NORMALIZED_TERMS.some((term) => textMatchesTerm(text, term));
}

export function isDisplayNameProfane(name) {
  if (!name) return false;
  return NORMALIZED_TERMS.some((term) => nameMatchesTerm(name, term));
}

export function isEmailProfane(email) {
  if (!email) return false;
  const value = String(email).trim();
  const at = value.indexOf('@');
  const local = at === -1 ? value : value.slice(0, at);
  const domain = at === -1 ? '' : value.slice(at + 1);
  return containsProfanity(local) || containsProfanity(domain);
}

export function assertCleanDisplayName(name) {
  const trimmed = String(name ?? '').trim();
  const formatIssue = hasInvalidDisplayNameFormat(trimmed);
  if (formatIssue === 'space') {
    throw new Error(NAME_SPACE_ERROR);
  }
  if (formatIssue === 'chars') {
    throw new Error(NAME_CHARS_ERROR);
  }
  if (isDisplayNameProfane(trimmed)) {
    throw new Error(PROFANITY_ERROR);
  }
}

export function assertCleanEmail(email) {
  if (isEmailProfane(email)) {
    throw new Error(PROFANITY_ERROR);
  }
}

export function attachProfanityInputGuard(inputEl, { mode = 'name' } = {}) {
  if (!inputEl || inputEl.dataset.profanityGuard) return;
  inputEl.dataset.profanityGuard = '1';

  let lastClean = inputEl.value || '';

  inputEl.addEventListener('input', () => {
    let value = inputEl.value;

    if (mode === 'name') {
      const stripped = value.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '');
      if (stripped !== value) {
        value = stripped;
        inputEl.value = value;
      }
    }

    const profane = mode === 'email' ? isEmailProfane(value) : isDisplayNameProfane(value);
    if (profane) {
      inputEl.value = lastClean;
    } else {
      lastClean = value;
    }
  });
}

export function initProfanityInputGuards() {
  attachProfanityInputGuard(document.getElementById('signup-displayname'), { mode: 'name' });
  attachProfanityInputGuard(document.getElementById('signup-email'), { mode: 'email' });
  attachProfanityInputGuard(document.getElementById('signin-email'), { mode: 'email' });
  attachProfanityInputGuard(document.getElementById('forgot-email'), { mode: 'email' });
}
