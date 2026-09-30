/**
 * Gold Price Service
 * Lấy giá vàng thời gian thực từ API vang.today
 *
 * API: https://www.vang.today/api/prices
 * - Miễn phí, không cần API key
 * - CORS enabled
 * - Cập nhật mỗi 5 phút
 * - Giá nội địa: VND/lượng; XAUUSD: USD/oz
 */

// Gold type codes from vang.today API
export type GoldTypeCode =
  | 'XAUUSD'     // Vàng thế giới (USD/oz)
  | 'SJL1L10'    // SJC 1L - 10L
  | 'SJ9999'     // SJC 9999 (vàng nhẫn SJC)
  | 'DOHNL'      // DOJI Hà Nội (lượng)
  | 'DOHCML'     // DOJI HCM (lượng)
  | 'DOJINHTV'   // DOJI nhẫn tròn vàng
  | 'BTSJC'      // BTMC SJC
  | 'BT9999NTT'  // BTMC 9999 nhẫn tròn trơn
  | 'PQHNVM'     // PNJ Hà Nội vàng miếng
  | 'PQHN24NTT'  // PNJ 24K nhẫn tròn trơn
  | 'VNGSJC'     // Vàng Việt Nam SJC
  | 'VIETTINMSJC'; // Viettin SJC

export interface GoldPrice {
  typeCode: GoldTypeCode;
  typeName: string;
  buy: number;        // Giá mua (VND/lượng hoặc USD/oz)
  sell: number;       // Giá bán
  changeBuy: number;  // Thay đổi giá mua
  changeSell: number; // Thay đổi giá bán
  updateTime: number; // Unix timestamp
  unit: 'VND' | 'USD';
}

export interface GoldPriceResponse {
  success: boolean;
  currentTime: number;
  data: GoldPrice[];
}

export interface GoldPriceHistory {
  typeCode: GoldTypeCode;
  history: {
    date: string;
    buy: number;
    sell: number;
  }[];
}

// Display names for gold types
export const GOLD_TYPE_NAMES: Record<GoldTypeCode, string> = {
  XAUUSD: 'Vàng thế giới (USD/oz)',
  SJL1L10: 'SJC 1L - 10L',
  SJ9999: 'SJC 9999 (nhẫn)',
  DOHNL: 'DOJI Hà Nội',
  DOHCML: 'DOJI TP.HCM',
  DOJINHTV: 'DOJI nhẫn tròn',
  BTSJC: 'BTMC SJC',
  BT9999NTT: 'BTMC nhẫn 9999',
  PQHNVM: 'PNJ vàng miếng',
  PQHN24NTT: 'PNJ nhẫn 24K',
  VNGSJC: 'Vàng VN SJC',
  VIETTINMSJC: 'VietinBank SJC',
};

// Gold types commonly used for tax calculation
export const POPULAR_GOLD_TYPES: GoldTypeCode[] = [
  'SJL1L10',
  'SJ9999',
  'DOHNL',
  'DOHCML',
  'BTSJC',
  'PQHNVM',
  'XAUUSD',
];

// Category grouping
export interface GoldCategory {
  id: string;
  name: string;
  types: GoldTypeCode[];
}

export const GOLD_CATEGORIES: GoldCategory[] = [
  {
    id: 'sjc',
    name: 'SJC',
    types: ['SJL1L10', 'SJ9999'],
  },
  {
    id: 'doji',
    name: 'DOJI',
    types: ['DOHNL', 'DOHCML', 'DOJINHTV'],
  },
  {
    id: 'btmc',
    name: 'BTMC',
    types: ['BTSJC', 'BT9999NTT'],
  },
  {
    id: 'pnj',
    name: 'PNJ',
    types: ['PQHNVM', 'PQHN24NTT'],
  },
  {
    id: 'other',
    name: 'Khác',
    types: ['VNGSJC', 'VIETTINMSJC'],
  },
  {
    id: 'world',
    name: 'Thế giới',
    types: ['XAUUSD'],
  },
];

const API_BASE = 'https://www.vang.today/api';
const TIMEOUT_MS = 10000;

/** AbortSignal.timeout chưa có trên trình duyệt cũ (Safari < 16) → tự hẹn giờ abort */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Gọi API và đổi mọi lỗi mạng/HTTP/dữ liệu thành thông báo tiếng Việt thân thiện */
async function fetchJSON(url: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(TIMEOUT_MS),
    });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    throw new Error(
      name === 'TimeoutError' || name === 'AbortError'
        ? 'Máy chủ giá vàng phản hồi quá lâu. Vui lòng thử lại sau.'
        : 'Không kết nối được máy chủ giá vàng. Hãy kiểm tra mạng rồi thử lại.'
    );
  }

  if (!response.ok) {
    throw new Error(`Máy chủ giá vàng đang gặp lỗi (mã ${response.status}). Vui lòng thử lại sau.`);
  }

  try {
    const raw = await response.json();
    if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  } catch {
    // rơi xuống lỗi dữ liệu bên dưới
  }
  throw new Error('Dữ liệu giá vàng không hợp lệ. Vui lòng thử lại sau.');
}

/**
 * Fetch current gold prices from vang.today API
 *
 * Response format:
 * {
 *   "success": true,
 *   "timestamp": 1773678605,
 *   "time": "23:30",
 *   "date": "2026-03-16",
 *   "count": 12,
 *   "prices": {
 *     "SJL1L10": { "name": "SJC 9999", "buy": 180100000, "sell": 183100000, "change_buy": 500000, "change_sell": 500000, "currency": "VND" },
 *     ...
 *   }
 * }
 */
export async function fetchGoldPrices(): Promise<GoldPriceResponse> {
  const raw = await fetchJSON(`${API_BASE}/prices`);

  if (!raw.success) {
    throw new Error('Máy chủ giá vàng tạm thời không trả dữ liệu. Vui lòng thử lại sau.');
  }

  // API returns prices as an object keyed by type code
  const pricesObj = (raw.prices || {}) as Record<string, unknown>;
  const timestamp = Number(raw.timestamp) || Math.floor(Date.now() / 1000);

  const data: GoldPrice[] = Object.entries(pricesObj).map(([code, item]) => {
    const p = (item || {}) as Record<string, unknown>;
    return {
      typeCode: code as GoldTypeCode,
      typeName: GOLD_TYPE_NAMES[code as GoldTypeCode] || String(p.name || code),
      buy: Number(p.buy) || 0,
      sell: Number(p.sell) || 0,
      changeBuy: Number(p.change_buy) || 0,
      changeSell: Number(p.change_sell) || 0,
      updateTime: timestamp,
      unit: (code === 'XAUUSD' ? 'USD' : 'VND') as 'VND' | 'USD',
    };
  });

  return {
    success: true,
    currentTime: timestamp,
    data,
  };
}

/**
 * Fetch gold price history
 *
 * Response format:
 * {
 *   "success": true,
 *   "days": 3,
 *   "type": "SJL1L10",
 *   "history": [
 *     { "date": "2026-03-16", "prices": { "SJL1L10": { "buy": 180100000, "sell": 183100000, ... } } },
 *     ...
 *   ]
 * }
 */
export async function fetchGoldPriceHistory(
  typeCode: GoldTypeCode,
  days: number = 7
): Promise<GoldPriceHistory> {
  const raw = await fetchJSON(`${API_BASE}/prices?type=${typeCode}&days=${Math.min(days, 30)}`);

  const history = ((Array.isArray(raw.history) ? raw.history : []) as Record<string, unknown>[]).map((day) => {
    const pricesObj = (day.prices || {}) as Record<string, Record<string, unknown>>;
    const priceData = pricesObj[typeCode] || {};
    return {
      date: String(day.date || ''),
      buy: Number(priceData.buy) || 0,
      sell: Number(priceData.sell) || 0,
    };
  });

  return { typeCode, history };
}

/**
 * Format gold price for display
 */
export function formatGoldPrice(price: number, unit: 'VND' | 'USD'): string {
  if (unit === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  }

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Get change indicator text and color
 */
export function getChangeInfo(change: number): {
  text: string;
  color: string;
  arrow: string;
} {
  if (change > 0) {
    return {
      text: `+${new Intl.NumberFormat('vi-VN').format(change)}`,
      color: 'text-green-600',
      arrow: '▲',
    };
  }
  if (change < 0) {
    return {
      text: new Intl.NumberFormat('vi-VN').format(change),
      color: 'text-red-600',
      arrow: '▼',
    };
  }
  return { text: '0', color: 'text-gray-500', arrow: '–' };
}
