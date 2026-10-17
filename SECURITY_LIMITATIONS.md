# Three-Factor Authentication Access Control System (3FA)
## Prototype Security Analysis & Limitations Document

> **Notice**: This document outlines the security architecture, assumptions, cryptographic boundaries, and known limitations of the prototype implementation. As an academic capstone and research prototype, this software **must not be described or certified as production-secure** without an independent third-party security assessment and formal physical/hardware penetration audit.

---

### 1. Scope & System Architecture

The 3FA system enforces a multi-tiered security model dividing authentication into two completely separate domains:
1. **Administrative Access**: Admin portal login protected by username + Argon2id hashed credentials, role-based access control (RBAC), CSRF protection, session expiration, and rate-limiting throttling.
2. **Campus Access Point (Physical/Terminal 3FA)**: Enforces three distinct authentication factors:
   - **Factor 1 (What You Know)**: User PIN (hashed with Argon2id / salt-bound digest).
   - **Factor 2 (What You Have)**: Mifare Classic 1K RFID Card UID tokenized via keyed `HMAC-SHA256(UID, salt)`.
   - **Factor 3 (Who You Are)**: OpenCV facial biometric verification comparing 128-D L2-normalized feature embeddings via Euclidean distance against an enrolled template under threshold $\theta \in [0.30, 0.70]$.

---

### 2. Cryptographic Digest Usage & Clear Distinctions

#### A. Password & PIN Storage: Argon2id
- **Algorithm**: Argon2id (`v=19`, `memory_cost=65536 KB`, `time_cost=3`, `parallelism=4`).
- Plain SHA-256 is **never** used for password or PIN storage. SHA-256 lacks memory hardness and is vulnerable to high-throughput GPU/ASIC rainbow table dictionary attacks.
- Argon2id provides memory-hardness and protection against side-channel and GPU cracking attacks.

#### B. RFID Tokenization: Keyed Cryptographic Digest
- RFID card physical UIDs (4-byte or 7-byte serials) are never stored as raw serial numbers in the primary database. Instead, they are tokenized using `HMAC-SHA256(raw_uid, rfid_system_salt)`.
- **Limitation**: While tokenization prevents a database reader from immediately observing the raw card serial, standard Mifare Classic 1K cards are vulnerable to card cloning/emulation (e.g., Proxmark3, Flipper Zero). In production environments, cryptographic smartcards (such as Mifare DESFire EV2/EV3 with AES-128 mutual authentication) are required.

#### C. Biometric Embeddings: Non-Reversible Representation
- Biometric facial templates are stored as 128-dimensional floating-point vector arrays (packed binary blobs or JSON arrays), **not** raw facial images.
- **Limitation & Disclosure**: Storing facial feature embeddings does not constitute "SHA-256 encryption". SHA-256 is an irreversible cryptographic hash, not an encryption cipher. If embeddings were merely SHA-256 hashed, biometric distance matching (Euclidean / cosine) would be mathematically impossible. Thus, biometric templates are stored as normalized vectors. While reconstructing high-resolution photorealistic faces from 128-D embeddings is difficult, template inversion attacks have been demonstrated in academic literature; in production, cancelable biometrics or homomorphic encryption should be used.

#### D. Audit Log Hash Chaining (SHA-256)
- Each audit log entry includes an integrity hash: $\text{hash}_i = \text{SHA-256}(\text{hash}_{i-1} \parallel \text{timestamp} \parallel \text{event\_type} \parallel \text{details})$.
- **Limitation**: An ordinary cryptographic hash chain running inside a standard relational database allows detection of single-row accidental corruption, but **does not make logs tamper-proof against a privileged attacker or database administrator** who possesses write access to the database and can recompute the entire hash chain. In production, write-once audit logs (WORM storage, hardware security modules, or append-only distributed ledgers) are required for non-repudiation.

---

### 3. Known Prototype Limitations & Threats

| Threat Vector | Prototype Behavior | Production Requirement |
| :--- | :--- | :--- |
| **Facial Presentation Attacks (Spoofing)** | Baseline 2D facial verification using OpenCV Euclidean distance. | Hardware depth sensing (IR / structured light / ToF) or multi-frame liveness detection (blink, gaze tracking, challenge-response). |
| **RFID Card Cloning** | Tokenizes card UID using SHA-256. | Mifare DESFire EV3 or smartcard with challenge-response crypto keys stored in a Hardware Security Module (HSM). |
| **Physical Tampering at Terminal** | GPIO simulation or USB serial input. | Tamper-switched enclosure, encrypted Wiegand/OSDP v2 communication between reader and access controller. |
| **Network & Transport** | HTTP in local development; secure session cookies configured for production flag. | Mandatory TLS 1.3 with HSTS, pinned certificates, and mTLS between edge terminal and authentication server. |
| **Database Compromise** | Secrets isolated in environment variables; sensitive credentials hashed with Argon2id. | Transparent Data Encryption (TDE) at rest, database field-level encryption with cloud Key Management Service (KMS). |
| **Denial of Service (DoS)** | In-memory failed attempt tracking and throttling windows. | Distributed rate limiting (e.g., Redis cluster) and Web Application Firewall (WAF) layer. |

---

### 4. Conclusion & Deployment Readiness

This software is an engineering and research artifact demonstrating three-factor decision logic, fail-secure failover, and statistical biometric threshold evaluation (FAR/FRR ROC analysis). It must undergo comprehensive independent security assessments, penetration testing, and hardware security hardening before being utilized for life-safety or high-security physical perimeter defense.
