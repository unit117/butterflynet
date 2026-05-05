export type TerminalLineType =
  | "user_prompt"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "agent_text"
  | "status_warn"
  | "status_ok"
  | "handoff";

export interface TerminalLine {
  t: number;
  type: TerminalLineType;
  content: string;
}

export const PHASE1_AGENT = "kicad-design-research";

export const PHASE1_TERMINAL: TerminalLine[] = [
  { t: 0, type: "user_prompt", content: "Recreate the Ingo Maurer 'My New Flame' lamp, faithful to the product." },
  { t: 200, type: "agent_text", content: "Starting research phase. I'll gather sources, build a tagged fact ledger, and surface unresolved questions before any spec work." },

  { t: 600, type: "thinking", content: "Searching for the product to confirm naming and current SKU." },
  { t: 700, type: "tool_call", content: "WebSearch(\"Ingo Maurer My New Flame lamp\")" },
  { t: 850, type: "tool_result", content: "8 results · official site, MoMA Store, retailer pages" },

  { t: 1000, type: "tool_call", content: "WebFetch(\"ingo-maurer.com/en/products/my-new-flame\")" },
  { t: 1700, type: "tool_result", content: "2.1k chars · product page, datasheet links" },
  { t: 1800, type: "agent_text", content: "Vendor lists it as \"My New Flame\" — confirming canonical name (often miswritten \"One New Flame\")." },

  { t: 2100, type: "tool_call", content: "WebFetch(\"store.moma.org/products/my-new-flame\")" },
  { t: 2400, type: "tool_result", content: "800 chars · MoMA Design Store listing, naming consistent" },

  { t: 2500, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 2570, type: "tool_result", content: "Product: 'My New Flame' by Ingo Maurer (not 'One New Flame')" },

  { t: 3000, type: "thinking", content: "Pulling the official manual for charging and power specs." },
  { t: 3100, type: "tool_call", content: "WebFetch(\"ingo-maurer.com/manual.pdf\")" },
  { t: 3200, type: "tool_result", content: "14 pages · official instruction manual" },

  { t: 4000, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 4060, type: "tool_result", content: "Charges 4× AA NiMH cells from USB" },

  { t: 4600, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 4660, type: "tool_result", content: "Can run while charging, or from USB with no batteries" },

  { t: 5200, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 5260, type: "tool_result", content: "Base LED: yellow while charging, green when full" },

  { t: 5600, type: "thinking", content: "Older revision shows mini-USB; need to confirm current production." },
  { t: 5700, type: "tool_call", content: "WebFetch(\"retailer page — current stock revision notes\")" },
  { t: 5850, type: "tool_result", content: "Current revision is USB-C input" },

  { t: 6400, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 6460, type: "tool_result", content: "Current revision: USB-C input (5V max 1000mA)" },

  { t: 7000, type: "tool_call", content: "fact_add(tag=\"published\")" },
  { t: 7060, type: "tool_result", content: "2×128 dimmable LEDs (256 total)" },

  { t: 7500, type: "thinking", content: "Manual is text-only on LED layout. Examining cover photo for physical population." },
  { t: 7700, type: "tool_call", content: "Read(\"manual_cover.png\")" },
  { t: 7850, type: "tool_result", content: "high-res scan loaded · rectangular LED grid visible on PCB" },

  { t: 8600, type: "tool_call", content: "fact_add(tag=\"photo-derived\")" },
  { t: 8660, type: "tool_result", content: "LED field is rectangular 8×16 array per face (128 LEDs each side)" },

  { t: 9400, type: "tool_call", content: "fact_add(tag=\"photo-derived\")" },
  { t: 9460, type: "tool_result", content: "Four dark rectangular features on PCB edge → concealed socket/contacts" },

  { t: 10000, type: "thinking", content: "Searching driver IC and MCU candidates for downstream reconstruction." },
  { t: 10100, type: "tool_call", content: "WebFetch(\"issi.com/IS31FL3733-datasheet\")" },
  { t: 10250, type: "tool_result", content: "16×12 matrix LED driver, I2C, QFN-48" },

  { t: 10800, type: "tool_call", content: "WebFetch(\"microchip.com/ATtiny1616-datasheet\")" },
  { t: 11000, type: "tool_result", content: "20-pin AVR, hardware I2C, UPDI programming" },

  { t: 11800, type: "tool_call", content: "fact_add(tag=\"reconstruction\")" },
  { t: 11860, type: "tool_result", content: "Charger likely uses boost/SEPIC topology for 4S NiMH from 5V" },

  { t: 12600, type: "tool_call", content: "fact_add(tag=\"reconstruction\")" },
  { t: 12660, type: "tool_result", content: "Stem/base interface: 4-feature edge pads (PWR, PWR, GND, GND hypothesis)" },

  { t: 13400, type: "tool_call", content: "fact_add(tag=\"photo-derived\")" },
  { t: 13460, type: "tool_result", content: "Not flame-shaped physical population — rectangular layout, flame is rendered" },

  { t: 14000, type: "status_warn", content: "Three items remain unresolved despite source coverage." },

  { t: 14200, type: "tool_call", content: "question_log()" },
  { t: 14260, type: "tool_result", content: "Charger topology: boost or SEPIC? Which IC?" },

  { t: 14800, type: "tool_call", content: "question_log()" },
  { t: 14860, type: "tool_result", content: "Contact geometry: spring pins, pogo pads, or edge connector?" },

  { t: 15400, type: "tool_call", content: "question_log()" },
  { t: 15460, type: "tool_result", content: "Exact LED driver IC (IS31FL3733 vs IS31FL3731)?" },

  { t: 15900, type: "status_ok", content: "Research brief complete · 11 facts · 7 sources · 3 unresolved questions" },
  { t: 15950, type: "handoff", content: "Handing off to kicad-spec-normalizer to consolidate the brief into a canonical spec." },
];
