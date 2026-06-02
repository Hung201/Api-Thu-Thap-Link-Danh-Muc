## Actor thu thập link danh mục website là gì?

**Thu thập link danh mục website** là Apify Actor quét một website từ **URL khởi đầu** (trang chủ hoặc trang danh mục gốc) và gom **tất cả link trang danh mục** vào dataset: menu điều hướng, footer menu, và URL có pattern danh mục (`/danh-muc/`, `/categories/`, `/collections/`, …). Actor dùng **CheerioCrawler** (HTTP, nhanh) — phù hợp site HTML tĩnh; site render hoàn toàn bằng JavaScript có thể cần Playwright.

Chạy thử trên [Apify Console](https://console.apify.com/), lên lịch, gọi API, hoặc tích hợp Zapier/Make.

## Vì sao dùng Actor này?

- **Khám phá cấu trúc danh mục** trước khi cào sản phẩm chi tiết
- **Lập bản đồ URL** cho SEO, audit site, hoặc pipeline Crawlee tiếp theo
- **Một URL vào → danh sách link danh mục** có nhãn, nguồn trang, độ sâu crawl

## Cách dùng

Actor chạy ở chế độ **HTTP API (standby)**: gửi JSON giống `input.json`, nhận danh sách link danh mục trong response.

### API (mặc định)

```bash
cp .env.example .env   # chỉnh PORT nếu cần
npm start
# hoặc sau apify push — gọi URL standby của Actor trên Apify
```

**`.env` (local / server riêng):**

| Biến | Mặc định | Mô tả |
|------|----------|--------|
| `PORT` | `4321` | Port API Postman |
| `RUN_MODE` | `api` | `batch` = chạy một lần từ input.json |

Trên **Apify Cloud** không cần file `.env` — dùng `ACTOR_WEB_SERVER_PORT` do platform gán.

**POST** `http://localhost:4321/collect-category-links`  
**Content-Type:** `application/json`  
**Body:** giống hệt `input.json`:

```bash
curl -X POST http://localhost:4321/collect-category-links ^
  -H "Content-Type: application/json" ^
  -d @input.json
```

**Response:**

```json
{
  "success": true,
  "total": 3,
  "items": [
    { "url": "...", "label": "...", "sourceUrl": "...", "fromNav": true, "depth": 0 }
  ]
}
```

| Endpoint | Mô tả |
|----------|--------|
| `GET /` | Health + readiness probe (Apify) |
| `GET /health` | Trạng thái server |
| `POST /collect-category-links` | Thu thập link danh mục |

### Chế độ batch (local / `input.json`)

```bash
npm run start:batch
# hoặc: apify run -- --batch   (nếu hỗ trợ)
```

Đọc `input.json` (nếu có) hoặc Input Apify, ghi kết quả vào dataset — không bật HTTP server.

## Input

| Trường | Mô tả | Mặc định |
|--------|--------|----------|
| `startUrl` | URL website khởi đầu | — |
| `startUrls` | Thêm URL (mảng) | `[]` |
| `maxCategoryLinks` | **Giới hạn số link danh mục** (0 = không giới hạn) | `0` |
| `maxDepth` | Độ sâu crawl danh mục con | `1` |
| `maxRequestsPerCrawl` | Số trang HTTP tối đa | `50` |
| `includeHomepage` | Tự quét trang chủ để lấy menu Danh mục | `true` |
| `includeSubdomains` | Gồm subdomain | `false` |
| `proxyConfiguration` | Proxy Apify | `useApifyProxy: false` |

Ví dụ `input.json`:

```json
{
    "startUrl": "https://tongkhokeodan.com/",
    "maxCategoryLinks": 200,
    "maxDepth": 1,
    "maxRequestsPerCrawl": 50
}
```

Hỗ trợ **WooCommerce / WordPress** (menu `product_cat`), Haravan-style path `/danh-muc/`, và các menu **Danh mục** tiếng Việt — **không** lấy trang sản phẩm lẻ hay `/shop/?filter_...`.

## Output

Mỗi dòng dataset là một link danh mục:

```json
{
    "url": "https://shop-example.com/danh-muc/giay",
    "label": "Giày",
    "sourceUrl": "https://shop-example.com/",
    "fromNav": true,
    "depth": 0
}
```

Tải dataset dạng **JSON, CSV, Excel, HTML**.

## Bảng dữ liệu

| Trường | Ý nghĩa |
|--------|---------|
| `url` | Link trang danh mục |
| `label` | Text hiển thị của thẻ `<a>` |
| `sourceUrl` | Trang phát hiện link |
| `fromNav` | Có trong menu/nav không |
| `depth` | Độ sâu so với URL khởi đầu |

## Chi phí ước tính

Phụ thuộc `maxRequestsPerCrawl` và tốc độ site. Cheerio nhẹ hơn browser; giới hạn `maxRequestsPerCrawl` và `maxDepth` để kiểm soát compute units trên Apify.

## Mẹo nâng cao

- Tăng `maxDepth` nếu site có nhiều cấp danh mục con.
- Bật **Apify Proxy** khi bị chặn IP.
- Site SPA/JS nặng: cân nhắc chuyển sang PlaywrightCrawler.
- Thêm pattern URL riêng: sửa `CATEGORY_PATH` trong `src/categoryLinks.js`.

## FAQ & lưu ý

- Chỉ crawl **cùng domain** (trừ khi bật `includeSubdomains`).
- Tuân thủ **robots.txt**, điều khoản site và pháp luật địa phương.
- Actor **heuristic** — mỗi website có cấu trúc khác nhau; có thể cần tinh chỉnh selector/pattern.
- Phản hồi / báo lỗi: tab **Issues** trên Apify Store hoặc repository của bạn.
