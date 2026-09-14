import { z } from 'zod';

/**
 * 서버가 내려주는 원시 표기에 이름을 붙인 스키마 모음.
 *
 * 출처: `docs/api/apiSpec.md` §1.1 기본 정보 (금액·수량·등락률·그 외 비율·시각·종목코드) ·
 * `frontend/docs/contracts.md` C16~C19 (시각 표기 · 금액과 수량 · 등락률·수익률 · 종목코드).
 *
 * **왜 브랜딩하나.** 한 문서 안에 백분율 계열과 0~1 소수 계열이 함께 있다.
 * 둘 다 그냥 `number` 로 두면 등락률(`-1.21` = −1.21%)에 0~1 검증을 붙이거나
 * 비중(`0.4168` = 41.68%)에 100 을 곱하지 않는 사고가 타입 검사에서 걸러지지 않는다.
 * 브랜드가 다르면 서로 대입되지 않으므로 컴파일 시점에 갈린다.
 *
 * **목 데이터를 만들 때.** 브랜드는 출력 타입에만 붙는다. 입력 타입은 그대로
 * `number` · `string` 이므로 MSW 픽스처는 `z.input<typeof XxxSchema>` 를 쓰면
 * 캐스팅 없이 평범한 리터럴로 적을 수 있다.
 */

/**
 * 원 단위 정수 금액 (`long`). 소수점·콤마 없이 숫자만 온다 (apiSpec §1.1 금액).
 * 실현손익·평가손익처럼 음수가 오는 자리가 있어 부호 제한을 걸지 않는다.
 */
export const KrwAmountSchema = z.number().int().brand<'KrwAmount'>();
export type KrwAmount = z.infer<typeof KrwAmountSchema>;

/** 주식 수량. 정수 (`long`) (apiSpec §1.1 수량). */
export const QuantitySchema = z.number().int().brand<'Quantity'>();
export type Quantity = z.infer<typeof QuantitySchema>;

/**
 * 등락률·수익률 (apiSpec §1.1 등락률·수익률 · contracts C18).
 *
 * **백분율 값이다. 0~1 소수가 아니다.** `-1.21` 은 −1.21% 를 뜻한다.
 * 화면은 `%` 기호만 붙이고 **100 을 곱하지 않는다.**
 */
export const PercentSchema = z.number().brand<'Percent'>();
export type Percent = z.infer<typeof PercentSchema>;

/**
 * 등락률·수익률을 뺀 나머지 비율 (apiSpec §1.1 그 외 비율 · AI 명세 §2.1 비율).
 *
 * **0~1 소수 계열이다.** 비중 `0.0512` 는 5.12% 를 뜻하고 화면에서 100 을 곱한다.
 *
 * 범위 검증을 걸지 않은 이유는 AI 지표에 음수와 1 초과가 실제로 섞여 오기 때문이다 —
 * `maxDrawdown1y` 는 `-0.2214`, `annualizedVolatility` 는 1 을 넘을 수 있다
 * (AI 명세 §5 포트폴리오 진단 `indicators`). 계열을 가르는 것이 목적이고
 * 범위를 강제하는 것이 목적이 아니다. 0~1 이 보장된 자리에는 아래
 * `UnitIntervalSchema` 를 쓴다.
 */
export const RatioSchema = z.number().brand<'Ratio'>();
export type Ratio = z.infer<typeof RatioSchema>;

/**
 * 0~1 이 명세로 보장된 점수형 비율. `RatioSchema` 와 같은 브랜드라 서로 대입된다.
 * 쓰는 자리: `citations[].relevance` · `events[].matchedConfidence` ·
 * `briefing.items[].relevanceScore` (AI 명세 §2.4 · §6 · §8).
 */
export const UnitIntervalSchema = z.number().min(0).max(1).brand<'Ratio'>();

/**
 * ISO 8601 + KST 오프셋 (`2026-08-20T14:30:00+09:00`) (apiSpec §1.1 시각 · contracts C16).
 * `offset: true` 가 없으면 Zod 가 `Z` 로 끝나는 값만 통과시켜 KST 오프셋을 전부 튕긴다.
 */
export const IsoDateTimeSchema = z.iso
  .datetime({ offset: true })
  .brand<'IsoDateTime'>();
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;

/**
 * 날짜만 있는 값 (`2026-08-20`). 캔들의 `date`, 브리핑의 `date`,
 * 수익률 원인 분석의 `start`·`end` 가 이 모양이다 (apiSpec §5.3 · AI 명세 §6 · §8).
 */
export const IsoDateSchema = z.iso.date().brand<'IsoDate'>();
export type IsoDate = z.infer<typeof IsoDateSchema>;

/**
 * 6자리 종목코드 문자열 (apiSpec §1.1 종목코드 · contracts C19).
 * 정수로 다루면 `005930` 의 앞 `0` 이 사라진다.
 * 프론트 파라미터 이름은 `stockCode` 로 통일한다.
 *
 * **숫자만 받으면 안 된다.** 전에 `\d{6}` 이었다가 실제 백엔드에 붙이는 순간 검색이
 * 통째로 죽었다 (FINCH-255). 우선주·전환우선주·신규 지주사에는 영문자가 섞인다 —
 * `02826K`(삼성물산우B) · `0126Z0`(삼성에피스홀딩스) · `37550L`(DL이앤씨2우(전환)).
 * 시드 300종목 중에도 9건이다.
 *
 * 하필 검색에서 먼저 터진 이유는 zod 배열 스키마가 **원소 하나만 어긋나도 배열 전체를
 * 버리기** 때문이다. `삼성` 검색 결과 10건에 `0126Z0` 이 하나 끼자 응답 전부가 `SchemaError`
 * 로 날아가 "검색 결과를 불러오지 못했어요" 가 떴다. `삼성전자` 는 후보가 `005930`·`005935`
 * 뿐이라 통과해서, 두 검색어의 결과가 갈리는 것처럼 보였다.
 *
 * 패턴은 백엔드 `KisMasterFileParser.STOCK_CODE` 와 **같은 값**이다. 임의로 넓힌 것이 아니라
 * 마스터 파일을 파싱하는 쪽과 맞춘 것이고, apiSpec §1.1 도 "6자리 **문자열**" 이라고만 한다
 * ("정수 금지" 는 타입 제약이지 문자를 배제하는 뜻이 아니다).
 */
export const StockCodeSchema = z
  .string()
  .regex(/^[0-9A-Z]{6}$/, '종목코드는 6자리 문자열이다')
  .brand<'StockCode'>();
export type StockCode = z.infer<typeof StockCodeSchema>;

/**
 * 커서 (apiSpec §1.5 페이징 · contracts C28).
 * **불투명 문자열이다.** 파싱·조작·해석하지 않고 받은 값을 그대로 되돌려 보낸다.
 * 브랜드를 붙인 이유는 아무 문자열이나 커서 자리에 들어가는 것을 막기 위해서다.
 */
export const CursorSchema = z.string().brand<'Cursor'>();
export type Cursor = z.infer<typeof CursorSchema>;

/**
 * 멱등성 키 (apiSpec §1.4 멱등성 · contracts C30).
 * 클라이언트가 UUID v4 로 만든다. 같은 클릭의 재시도는 같은 키, 새 클릭은 새 키다.
 */
export const IdempotencyKeySchema = z.uuid().brand<'IdempotencyKey'>();
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;

/**
 * 지수 포인트 (apiSpec §5.7 시장 지수 조회).
 *
 * **소수 둘째 자리까지의 실수다.** `2600.54` 는 2,600.54 포인트다.
 * §1.1 의 "금액은 원 단위 정수" 규칙에 대한 **명시적 예외**이고 apiSpec 이
 * 그렇게 적어 뒀다 — 지수는 금액이 아니다. `KrwAmountSchema` 로 받으면
 * `z.number().int()` 가 `2600.54` 를 튕겨 지수 전체가 스키마 실패로 죽는다.
 *
 * 표시는 `formatIndexPoint`·`formatSignedIndexPoint` 로 한다
 * (`shared/lib/formatNumber.ts`). `formatAmount` 는 `Math.round` 를 거쳐
 * 소수를 잘라 버린다.
 */
export const IndexPointSchema = z.number().brand<'IndexPoint'>();
export type IndexPoint = z.infer<typeof IndexPointSchema>;
