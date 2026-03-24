# CloudLens — Tech Stack

## Architecture Overview

```
+--------------------------------------------------+
|                   CLOUDLENS                       |
|          AI-Powered Photo Wall                    |
+--------------------------------------------------+

                    FRONTEND
+--------------------------------------------------+
|                                                    |
|   React 19  +  TypeScript  +  Tailwind CSS 4      |
|   Vite 7 (build) + vite-plugin-singlefile          |
|                                                    |
|   Single HTML file with inlined JS/CSS             |
|   Mission Impossible dark theme                    |
|   Masonry photo grid + slideshow mode              |
|   Client-side image resize + SHA-256 hashing       |
|                                                    |
+--------------------------------------------------+
                       |
                       | HTTPS
                       v
                    BACKEND
+--------------------------------------------------+
|                                                    |
|   Node.js 20  +  Express.js                       |
|   Multer (file uploads)                            |
|   REST API (auth, posts, likes, stats, admin)      |
|   File-based storage (data.json + /uploads)        |
|                                                    |
+--------------------------------------------------+
                       |
                       | AWS SDK v3
                       v
                  AI SERVICES
+--------------------------------------------------+
|                                                    |
|   Amazon Rekognition                               |
|   |- DetectLabels: object/scene recognition        |
|   |  (auto-caption + hashtag generation)           |
|   |- DetectModerationLabels: content safety        |
|   |  (auto-reject inappropriate content)           |
|                                                    |
+--------------------------------------------------+

               INFRASTRUCTURE
+--------------------------------------------------+
|                                                    |
|   AWS Elastic Beanstalk                            |
|   |- Amazon Linux 2023                             |
|   |- Node.js 20 platform                           |
|   |- Single Instance (t3.micro)                    |
|   |- Nginx reverse proxy                           |
|                                                    |
|   Amazon S3 (deployment artifacts)                 |
|   IAM (instance role + Rekognition access)         |
|                                                    |
+--------------------------------------------------+

                 DEV TOOLS
+--------------------------------------------------+
|                                                    |
|   Kiro IDE (AI-assisted development)               |
|   AWS CLI + Isengard (deployment)                  |
|                                                    |
+--------------------------------------------------+
```

## Services Used

| Service | Purpose | How |
|---------|---------|-----|
| Amazon Rekognition | Image analysis | DetectLabels identifies objects/scenes, generates captions and hashtags. DetectModerationLabels filters inappropriate content. |
| AWS Elastic Beanstalk | Hosting | Managed Node.js environment. Handles deployment, health monitoring, instance replacement. |
| Amazon S3 | Deployment | Stores deployment ZIP artifacts for EB version management. |
| AWS IAM | Security | Instance profile with least-privilege access: EB web tier + Rekognition read-only. |

## Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI component framework |
| TypeScript | 5.9 | Type safety |
| Tailwind CSS | 4.1 | Utility-first styling |
| Vite | 7.2 | Build tool |
| vite-plugin-singlefile | 2.3 | Bundles everything into one HTML |

## Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 | Runtime |
| Express.js | 4.18 | HTTP framework |
| Multer | 1.4 | File upload handling |
| @aws-sdk/client-rekognition | 3.700+ | Rekognition API client |

## Key Features

| Feature | Technology |
|---------|-----------|
| Photo upload (multi-file) | Multer + client-side resize |
| Duplicate detection | SHA-256 client hash + server check |
| AI auto-captioning | Rekognition DetectLabels + rule engine |
| Smart hashtags | Rekognition labels mapped to event tags |
| Content moderation | Rekognition DetectModerationLabels |
| Real-time wall | 10s auto-refresh polling |
| Slideshow mode | Client-side with 5s intervals |
| Geofencing | Haversine formula + browser Geolocation API |
| Like system | Toggle per user, stored as array |

## Data Flow: Photo Upload

```
1. User selects photo(s) on mobile/desktop
2. Browser resizes to 1200x1200 @ 85% JPEG
3. SHA-256 hash computed in browser
4. POST /api/posts with FormData (photo + username + hash)
5. Server checks hash against stored hashes (duplicate check)
6. Server sends image bytes to Rekognition:
   a. DetectLabels -> ["Person", "Smile", "Laptop", ...]
   b. DetectModerationLabels -> [] (safe) or ["Violence", ...] (blocked)
7. Server generates caption from labels (rule-based mapping)
8. Server generates hashtags: event tags + content-specific tags
9. Post saved to data.json with caption, hashtags, labels
10. Response sent to client
11. Wall auto-refreshes and shows new photo with AI-generated metadata
```

## Security

| Control | Implementation |
|---------|---------------|
| Authentication | Event code verification |
| Geofencing | Optional GPS radius check |
| Content moderation | Rekognition auto-screening |
| Duplicate prevention | SHA-256 hash dedup |
| Upload limits | 10MB max, image types only |
| IAM least privilege | Read-only Rekognition access |
| HTTPS/TLS | CloudFront with default TLS certificate (TLSv1.2) |

## Pending: HTTPS Configuration

HTTPS is enabled via Amazon CloudFront (distribution E25E5Q8686IUIA).

- HTTPS URL: https://d35q40kfgjexu1.cloudfront.net
- TLS 1.2 minimum protocol
- HTTP automatically redirects to HTTPS
- CloudFront default certificate (*.cloudfront.net)
- All HTTP methods forwarded (GET, POST, PUT, DELETE, etc.)
- No caching (all requests forwarded to EB origin)
