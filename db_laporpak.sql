-- 1. Tabel users
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    encrypted_telegram_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NULL,
    first_name VARCHAR(100) NULL,
    is_super_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel team_members
CREATE TABLE team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role ENUM('sh', 'psd') NOT NULL,
    added_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_user_role (user_id, role),
    INDEX idx_active (is_active)
);

-- 3. Tabel laporan
CREATE TABLE laporan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lapor_pak_id VARCHAR(20) UNIQUE NOT NULL,
    reporter_id INT NOT NULL,
    message_text TEXT NOT NULL,
    status ENUM('pending_approval', 'rejected', 'follow_up', 'closed') NOT NULL DEFAULT 'pending_approval',
    pic_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (pic_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_status (status),
    INDEX idx_lapor_pak (lapor_pak_id)
);

-- 4. Tabel updates
CREATE TABLE updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    laporan_id INT NOT NULL,
    psd_id INT NOT NULL,
    message_text TEXT NOT NULL,
    status ENUM('pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval',
    pic_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (psd_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (pic_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_status (status),
    INDEX idx_laporan (laporan_id)
);

-- 5. Tabel feedbacks
CREATE TABLE feedbacks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    laporan_id INT NOT NULL,
    reporter_id INT NOT NULL,
    message_text TEXT NOT NULL,
    status ENUM('pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'pending_approval',
    approved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_status (status),
    INDEX idx_laporan (laporan_id)
);