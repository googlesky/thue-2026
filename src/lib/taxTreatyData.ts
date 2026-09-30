/**
 * Double Tax Treaty Data - Hiệp định tránh đánh thuế hai lần
 *
 * Việt Nam đã ký kết hiệp định thuế với 80+ quốc gia và vùng lãnh thổ.
 * Dữ liệu này cung cấp thông tin tham khảo về thuế suất tối đa theo hiệp định.
 *
 * Căn cứ: Các hiệp định thuế song phương của Việt Nam; thủ tục áp dụng: TT 89/2026/TT-BTC Điều 76.
 * Hiệp định đã ký nhưng chưa có hiệu lực (status 'pending', VD Hoa Kỳ) không được áp dụng ưu đãi.
 * Nguồn: Bộ Tài chính Việt Nam, OECD
 */

import { getPerTransactionThreshold } from './taxCalculator';

// ===== TYPES =====

export interface TaxTreaty {
  // Thông tin cơ bản
  countryCode: string;           // Mã quốc gia ISO
  countryName: string;           // Tên tiếng Việt
  countryNameEn: string;         // Tên tiếng Anh
  signDate: string;              // Ngày ký (YYYY-MM-DD)
  effectiveDate: string;         // Ngày có hiệu lực (YYYY-MM-DD); rỗng nếu chưa có hiệu lực
  status: 'active' | 'pending' | 'terminated'; // pending: đã ký, chưa hiệu lực → không áp dụng ưu đãi

  // Thuế suất tối đa theo hiệp định (%)
  rates: {
    dividends: {
      standard: number;          // Thuế suất chuẩn
      qualified?: number;        // Thuế suất ưu đãi (góp vốn >= threshold)
      qualifiedThreshold?: number; // Ngưỡng góp vốn (%)
      note?: string;
    };
    interest: {
      standard: number;
      govBond: number;           // Trái phiếu Chính phủ (thường 0%)
      note?: string;
    };
    royalties: {
      standard: number;
      note?: string;
    };
    technicalServices?: {
      rate: number;              // Một số hiệp định có thuế riêng cho dịch vụ kỹ thuật
      note?: string;
    };
  };

  // Quy định về thu nhập từ lao động
  employment: {
    daysThreshold: number;       // Số ngày tối đa để được miễn thuế (thường 183)
    period: '12months' | 'calendar' | 'fiscal';
    note?: string;
  };

  // Điều khoản đặc biệt
  specialProvisions?: string[];

  // Phương pháp tránh đánh thuế hai lần
  method: 'credit' | 'exemption' | 'both';
  methodNote?: string;
}

export type TreatyCountryCode = string;

// ===== DATA =====

/**
 * Danh sách hiệp định thuế của Việt Nam
 * Ưu tiên các quốc gia có nhiều người Việt Nam làm việc
 */
export const TAX_TREATIES: Record<TreatyCountryCode, TaxTreaty> = {
  // CHÂU Á
  JP: {
    countryCode: 'JP',
    countryName: 'Nhật Bản',
    countryNameEn: 'Japan',
    signDate: '1995-10-24',
    effectiveDate: '1996-12-31',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        qualified: 10,
        qualifiedThreshold: 25,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
        note: 'Miễn thuế lãi TPCP và ngân hàng Nhà nước',
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: 'calendar',
      note: 'Tính trong năm dương lịch',
    },
    specialProvisions: [
      'Điều khoản về giáo viên, sinh viên',
      'Điều khoản về thu nhập từ chính phủ',
    ],
    method: 'credit',
    methodNote: 'Khấu trừ thuế đã nộp tại nước nguồn',
  },

  KR: {
    countryCode: 'KR',
    countryName: 'Hàn Quốc',
    countryNameEn: 'South Korea',
    signDate: '1994-09-20',
    effectiveDate: '1995-09-13',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        qualified: 10,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
        note: 'Có thể giảm theo dự án đầu tư đặc biệt',
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  TW: {
    countryCode: 'TW',
    countryName: 'Đài Loan',
    countryNameEn: 'Taiwan',
    signDate: '1998-04-06',
    effectiveDate: '1999-05-06',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  SG: {
    countryCode: 'SG',
    countryName: 'Singapore',
    countryNameEn: 'Singapore',
    signDate: '1994-03-02',
    effectiveDate: '1994-08-12',
    status: 'active',
    rates: {
      dividends: {
        standard: 12.5,
        qualified: 5,
        qualifiedThreshold: 25,
        note: '5% nếu góp vốn ≥ 25%, 12,5% các trường hợp khác',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  CN: {
    countryCode: 'CN',
    countryName: 'Trung Quốc',
    countryNameEn: 'China',
    signDate: '1995-05-17',
    effectiveDate: '1996-10-18',
    status: 'active',
    rates: {
      dividends: {
        standard: 10,
        note: '10% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: 'calendar',
    },
    method: 'credit',
  },

  TH: {
    countryCode: 'TH',
    countryName: 'Thái Lan',
    countryNameEn: 'Thailand',
    signDate: '1992-12-23',
    effectiveDate: '1993-12-29',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  MY: {
    countryCode: 'MY',
    countryName: 'Malaysia',
    countryNameEn: 'Malaysia',
    signDate: '1995-09-07',
    effectiveDate: '1996-08-13',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU ÂU
  DE: {
    countryCode: 'DE',
    countryName: 'Đức',
    countryNameEn: 'Germany',
    signDate: '1995-07-13',
    effectiveDate: '1996-12-27',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  FR: {
    countryCode: 'FR',
    countryName: 'Pháp',
    countryNameEn: 'France',
    signDate: '1993-02-10',
    effectiveDate: '1994-07-01',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 7,
        qualifiedThreshold: 70,
        note: '7% nếu góp vốn ≥ 70%, 15% các trường hợp khác',
      },
      interest: {
        standard: 0,
        govBond: 0,
        note: 'Miễn thuế hoàn toàn lãi',
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  GB: {
    countryCode: 'GB',
    countryName: 'Anh',
    countryNameEn: 'United Kingdom',
    signDate: '1994-07-09',
    effectiveDate: '1995-12-15',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 70,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  NL: {
    countryCode: 'NL',
    countryName: 'Hà Lan',
    countryNameEn: 'Netherlands',
    signDate: '1995-03-24',
    effectiveDate: '1996-01-25',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  RU: {
    countryCode: 'RU',
    countryName: 'Nga',
    countryNameEn: 'Russia',
    signDate: '1993-05-27',
    effectiveDate: '1996-03-21',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU MỸ
  // Ký 07/7/2015 nhưng đến nay CHƯA có hiệu lực → không áp dụng ưu đãi (mức thuế suất dưới chỉ để tham khảo)
  US: {
    countryCode: 'US',
    countryName: 'Hoa Kỳ',
    countryNameEn: 'United States',
    signDate: '2015-07-07',
    effectiveDate: '',
    status: 'pending',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
      note: 'Quy định đặc biệt cho người lao động di chuyển trong năm thuế',
    },
    specialProvisions: [
      'Điều khoản chống lạm dụng (LOB)',
    ],
    method: 'credit',
  },

  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    countryNameEn: 'Canada',
    signDate: '1997-11-14',
    effectiveDate: '1998-12-16',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // CHÂU ĐẠI DƯƠNG
  AU: {
    countryCode: 'AU',
    countryName: 'Úc',
    countryNameEn: 'Australia',
    signDate: '1992-04-13',
    effectiveDate: '1992-12-30',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  NZ: {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    countryNameEn: 'New Zealand',
    signDate: '2013-08-05',
    effectiveDate: '2014-10-08',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 15,
        note: '15% cho mọi trường hợp',
      },
      interest: {
        standard: 10,
        govBond: 0,
      },
      royalties: {
        standard: 10,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  // ASEAN KHÁC
  ID: {
    countryCode: 'ID',
    countryName: 'Indonesia',
    countryNameEn: 'Indonesia',
    signDate: '1997-10-22',
    effectiveDate: '1999-02-10',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 15,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },

  PH: {
    countryCode: 'PH',
    countryName: 'Philippines',
    countryNameEn: 'Philippines',
    signDate: '2001-11-14',
    effectiveDate: '2003-09-29',
    status: 'active',
    rates: {
      dividends: {
        standard: 15,
        qualified: 10,
        qualifiedThreshold: 25,
      },
      interest: {
        standard: 15,
        govBond: 0,
      },
      royalties: {
        standard: 15,
      },
    },
    employment: {
      daysThreshold: 183,
      period: '12months',
    },
    method: 'credit',
  },
};

// ===== HELPER FUNCTIONS =====

/**
 * Danh sách quốc gia có hiệp định (kể cả hiệp định đã ký nhưng chưa có hiệu lực — pending)
 */
export function getTreatyCountries(): Array<{
  code: string;
  name: string;
  nameEn: string;
  pending: boolean;
}> {
  return Object.values(TAX_TREATIES)
    .filter(t => t.status !== 'terminated')
    .map(t => ({
      code: t.countryCode,
      name: t.countryName,
      nameEn: t.countryNameEn,
      pending: t.status !== 'active',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/**
 * Lấy thông tin hiệp định theo mã quốc gia
 */
export function getTreaty(countryCode: string): TaxTreaty | null {
  return TAX_TREATIES[countryCode.toUpperCase()] || null;
}

/**
 * Điều khoản thu nhập từ lao động phụ thuộc của hiệp định: tiền lương của đối tượng cư trú nước kia
 * làm việc tại Việt Nam chỉ được miễn thuế tại Việt Nam khi ĐỒNG THỜI (a) có mặt KHÔNG QUÁ 183 ngày
 * trong kỳ quy định; (b) không do chủ lao động là đối tượng cư trú Việt Nam trả hoặc trả thay;
 * (c) không do cơ sở thường trú của chủ lao động tại Việt Nam chịu.
 * Hiệp định chưa có hiệu lực → không áp dụng.
 */
export function check183DayRule(
  countryCode: string,
  daysInVietnam: number
): {
  eligible: boolean;
  daysThreshold: number;
  daysRemaining: number;
  explanation: string;
  conditions: string[];
} {
  const treaty = getTreaty(countryCode);
  const threshold = treaty?.employment.daysThreshold || 183;
  const period = treaty?.employment.period === 'calendar' ? 'trong năm dương lịch' : 'trong bất kỳ giai đoạn 12 tháng nào';
  const conditions = [
    `Có mặt tại Việt Nam không quá ${threshold} ngày ${period}`,
    'Tiền lương không do chủ lao động là đối tượng cư trú của Việt Nam trả hoặc trả thay',
    'Tiền lương không do cơ sở thường trú của chủ lao động tại Việt Nam chịu',
  ];

  if (treaty?.status !== 'active') {
    return {
      eligible: false,
      daysThreshold: threshold,
      daysRemaining: 0,
      explanation: treaty
        ? `Hiệp định với ${treaty.countryName} chưa có hiệu lực: không áp dụng miễn thuế theo hiệp định.`
        : 'Không có hiệp định thuế với quốc gia này.',
      conditions,
    };
  }

  const eligible = daysInVietnam <= threshold;
  return {
    eligible,
    daysThreshold: threshold,
    daysRemaining: Math.max(0, threshold - daysInVietnam),
    explanation: eligible
      ? `Có mặt ${daysInVietnam} ngày (không quá ${threshold} ngày): đạt điều kiện số ngày; chỉ được miễn thuế tại Việt Nam khi đồng thời đáp ứng 2 điều kiện còn lại.`
      : `Có mặt ${daysInVietnam} ngày (quá ${threshold} ngày): không được miễn theo hiệp định, tiền lương làm việc tại Việt Nam chịu thuế tại Việt Nam.`,
    conditions,
  };
}

// Thuế suất trong nước đối với cá nhân không cư trú: cổ tức, lãi 5% (Luật 109/2025/QH15 Điều 22);
// bản quyền 5% × phần vượt ngưỡng mỗi hợp đồng (Điều 25)
const DOMESTIC_RATE = 0.05;

/**
 * Tính thuế khấu trừ có áp dụng hiệp định: Việt Nam thu theo mức thấp hơn giữa thuế trong nước
 * và mức trần của hiệp định (tính trên tổng số tiền).
 */
export function calculateWithholdingWithTreaty(
  countryCode: string,
  incomeType: 'dividends' | 'interest' | 'royalties',
  amount: number,
  isQualified: boolean = false
): {
  domesticRate: number;
  domesticTax: number;
  treatyRate: number;
  treatyTax: number;
  savings: number;
  notes: string[];
} {
  const treaty = getTreaty(countryCode);
  const notes: string[] = [];

  const domesticRate = DOMESTIC_RATE;
  const domesticBase = incomeType === 'royalties' ? Math.max(0, amount - getPerTransactionThreshold()) : amount;
  const domesticTax = Math.round(domesticBase * domesticRate);
  if (incomeType === 'royalties') {
    notes.push(`Thuế trong nước: 5% × phần vượt ${getPerTransactionThreshold().toLocaleString('vi-VN')} đồng mỗi hợp đồng (Luật 109/2025/QH15 Điều 25).`);
  }
  if (incomeType === 'interest') {
    notes.push('Lãi tiền gửi tại tổ chức tín dụng, lãi trái phiếu Chính phủ được miễn thuế trong nước (Luật 109/2025/QH15 Điều 4.6).');
  }

  if (treaty?.status !== 'active') {
    notes.push(
      treaty
        ? `Hiệp định với ${treaty.countryName} chưa có hiệu lực: áp dụng thuế suất trong nước.`
        : 'Không có hiệp định thuế với quốc gia này: áp dụng thuế suất trong nước.'
    );
    return { domesticRate, domesticTax, treatyRate: domesticRate, treatyTax: domesticTax, savings: 0, notes };
  }

  let treatyRate = treaty.rates[incomeType].standard / 100;
  if (incomeType === 'dividends' && isQualified && treaty.rates.dividends.qualified !== undefined) {
    treatyRate = treaty.rates.dividends.qualified / 100;
    notes.push(`Áp dụng thuế suất ưu đãi ${treaty.rates.dividends.qualified}% cho cổ tức (góp vốn ≥ ${treaty.rates.dividends.qualifiedThreshold}%).`);
  }

  const treatyTax = Math.round(amount * treatyRate);
  const savings = domesticTax - Math.min(domesticTax, treatyTax);

  notes.push(
    `Hiệp định với ${treaty.countryName}: thuế suất tối đa ${(treatyRate * 100).toLocaleString('vi-VN')}%; Việt Nam thu theo mức thấp hơn giữa thuế trong nước và mức trần hiệp định.`
  );
  if (savings > 0) {
    notes.push(`Tiết kiệm ${savings.toLocaleString('vi-VN')} đồng so với thuế suất trong nước.`);
  }

  return { domesticRate, domesticTax, treatyRate, treatyTax, savings, notes };
}

/**
 * Hồ sơ đề nghị miễn, giảm thuế theo hiệp định đối với cá nhân là đối tượng cư trú nước ngoài
 * (TT 89/2026/TT-BTC Điều 76). Hiệp định chưa có hiệu lực → không có hồ sơ áp dụng.
 */
export function getRequiredDocuments(countryCode: string): string[] {
  if (getTreaty(countryCode)?.status !== 'active') return [];

  return [
    'Văn bản đề nghị miễn, giảm thuế theo Hiệp định (mẫu 01/HTQT, Phụ lục III TT 89/2026/TT-BTC)',
    'Giấy chứng nhận cư trú do cơ quan thuế nước cư trú cấp, đã hợp pháp hóa lãnh sự, ghi rõ năm tính thuế đề nghị miễn, giảm',
    'Bản sao hợp đồng lao động với chủ lao động ở nước ngoài và tại Việt Nam (hoặc hợp đồng dịch vụ, đại lý), có cam kết của cá nhân',
    'Bản sao hộ chiếu sử dụng khi xuất nhập cảnh Việt Nam, có cam kết của cá nhân',
    'Cổ tức, lãi, bản quyền: bản sao hợp đồng, chứng từ chứng minh nguồn thu nhập',
    'Nộp cùng hồ sơ khai thuế lần đầu tại cơ quan thuế nơi đăng ký nộp thuế, hoặc ủy quyền cho bên Việt Nam chi trả thu nhập (TT 89/2026/TT-BTC Điều 76)',
  ];
}

/**
 * Format số tiền theo chuẩn Việt Nam
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
