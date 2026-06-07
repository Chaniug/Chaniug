/*
   Chaniug 个人主页 JavaScript — Moonshot Style
   星空粒子 · 聚光灯 · 滚动动效 · 懒加载
*/

(function () {
    'use strict';

    /* ============================================================
       工具函数
       ============================================================ */
    // 防抖
    function debounce(fn, delay) {
        let timer;
        return function () {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        };
    }

    // 检测是否为触屏设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 检测是否为移动设备（小屏）
    const isMobile = window.innerWidth < 768;

    // 页面可见性管理
    let pageVisible = true;
    document.addEventListener('visibilitychange', function () {
        pageVisible = !document.hidden;
    });

    /* ============================================================
       STARFIELD — Canvas 星空粒子（物理感闪烁）
       ============================================================ */
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');

    let stars = [];
    let width, height;
    let starAnimId;
    let globalTime = 0;

    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function createStars(count) {
        stars = [];
        for (let i = 0; i < count; i++) {
            // 恒星亮度遵循幂律分布：暗星多，亮星少
            const mag = Math.pow(Math.random(), 2.2);
            const isBright = mag > 0.82;

            // 自然星空风格
            const baseAlpha = 0.10 + mag * 0.70;
            const radius = 0.12 + mag * 1.5;

            // 闪烁幅度
            const twinkleAmp = isBright
                ? 0.08 + Math.random() * 0.14
                : 0.15 + Math.random() * 0.30;

            // 随机火花计时器
            const sparkleCooldown = 2 + Math.random() * 12;

            // 恒星色温分布 — 模拟真实夜空：
            // 60% 白星（A/F型，色温 7500K+，肉眼呈白色）
            // 25% 蓝白星（B/O型，色温 10000K+，极淡蓝调）
            // 10% 暖白星（G型，色温 ~5800K，太阳类似色）
            // 5%  橙红星（K/M型，色温 <4000K）
            const colorRoll = Math.random();
            let hue, sat;
            if (colorRoll < 0.60) {
                hue = 40 + Math.random() * 25;     // 白→暖白 40~65
                sat = 5 + Math.random() * 10;       // 极淡色
            } else if (colorRoll < 0.85) {
                hue = 200 + Math.random() * 20;     // 蓝白 200~220
                sat = 5 + Math.random() * 12;
            } else if (colorRoll < 0.95) {
                hue = 44 + Math.random() * 10;      // 暖白偏黄 44~54
                sat = 10 + Math.random() * 15;
            } else {
                hue = 20 + Math.random() * 15;      // 橙红 20~35
                sat = 15 + Math.random() * 20;
            }

            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: radius,
                baseAlpha: baseAlpha,
                twinkleAmp: twinkleAmp,
                freq1: 2.0 + Math.random() * 3.0,
                freq2: 5.0 + Math.random() * 7.0,
                freq3: 15.0 + Math.random() * 20.0,
                phase1: Math.random() * Math.PI * 2,
                phase2: Math.random() * Math.PI * 2,
                phase3: Math.random() * Math.PI * 2,
                isBright: isBright,
                hue: hue,
                sat: sat,
                sparkleTimer: Math.random() * sparkleCooldown,
                sparkleCooldown: sparkleCooldown,
                // 优化：拖尾历史 + 十字星芒
                trailHistory: [],      // 最近 N 帧的 sparkleBoost 记录
                trailMaxLen: 8,        // 拖尾长度
                currentTrail: 0,       // 当前平滑拖尾值
            });
        }
    }

    function drawStars() {
        if (!pageVisible) {
            starAnimId = requestAnimationFrame(drawStars);
            return;
        }

        ctx.clearRect(0, 0, width, height);
        globalTime += 0.016;

        for (const star of stars) {
            const t = globalTime;

            // 三频正弦叠加 → 不规则闪烁
            const shimmer =
                Math.sin(t * star.freq1 + star.phase1) * 0.40 +
                Math.sin(t * star.freq2 + star.phase2) * 0.35 +
                Math.sin(t * star.freq3 + star.phase3) * 0.25;

            // 随机火花
            let sparkleBoost = 0;
            star.sparkleTimer -= 0.016;
            if (star.sparkleTimer <= 0) {
                const elapsed = -star.sparkleTimer;
                if (elapsed < 0.6) {
                    sparkleBoost = Math.exp(-elapsed * 4.5) * (0.6 + Math.random() * 0.4);
                } else {
                    star.sparkleTimer = star.sparkleCooldown + Math.random() * 6;
                    star.sparkleCooldown = 2 + Math.random() * 12;
                }
            }

            // === 优化1: 拖尾余晖 — 平滑过渡火花爆发 ===
            star.trailHistory.push(sparkleBoost);
            if (star.trailHistory.length > star.trailMaxLen) star.trailHistory.shift();
            // 计算加权平均拖尾（最近帧权重更高）
            let trailSum = 0, trailWeight = 0;
            for (let i = 0; i < star.trailHistory.length; i++) {
                const w = (i + 1) / star.trailHistory.length;
                trailSum += star.trailHistory[i] * w;
                trailWeight += w;
            }
            const trailBoost = trailWeight > 0 ? trailSum / trailWeight : 0;
            // 平滑过渡
            star.currentTrail += (trailBoost - star.currentTrail) * 0.15;

            const alpha = star.baseAlpha + shimmer * star.twinkleAmp + sparkleBoost * star.twinkleAmp;
            const clampedAlpha = Math.max(0.01, Math.min(1, alpha));
            // 拖尾额外贡献（更柔和）
            const trailAlpha = Math.max(0, clampedAlpha + star.currentTrail * star.twinkleAmp * 0.5);

            // === 优化2: 色温动态变化 — 闪烁时偏蓝白，暗时偏暖 ===
            const colorShift = shimmer * 0.5 + sparkleBoost * 0.8; // -0.5 ~ +0.8
            const shiftedHue = star.hue - colorShift * 15; // 亮时色相向蓝端偏移
            const shiftedSat = Math.max(2, star.sat * (1 - Math.abs(colorShift) * 0.4));

            // 画拖尾余晖（在主体之前画，作为底层辉光）
            if (star.isBright && star.currentTrail > 0.02) {
                const trailGlowAlpha = star.currentTrail * star.twinkleAmp * 0.12;
                if (trailGlowAlpha > 0.003) {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius * 5, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${shiftedHue}, ${Math.max(3, shiftedSat * 0.5)}%, 70%, ${trailGlowAlpha})`;
                    ctx.fill();
                }
            }

            // 画主体星星
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);

            if (star.isBright) {
                const effLight = 75 + trailAlpha * 20;
                const effSat = Math.max(2, shiftedSat * (1 - trailAlpha * 0.5));
                ctx.fillStyle = `hsla(${shiftedHue}, ${effSat}%, ${effLight}%, ${trailAlpha})`;
                ctx.fill();

                // 光晕
                const glowAlpha = trailAlpha * 0.08;
                if (glowAlpha > 0.002) {
                    ctx.beginPath();
                    ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${shiftedHue}, ${Math.max(3, effSat * 0.6)}%, 65%, ${glowAlpha})`;
                    ctx.fill();
                }

                // === 优化3: 十字星芒 — 亮星爆发时绘制 ===
                const crossIntensity = sparkleBoost + star.currentTrail * 0.6;
                if (crossIntensity > 0.08) {
                    const crossAlpha = Math.min(1, crossIntensity * 1.2) * trailAlpha * 0.55;
                    const crossLen = star.radius * (6 + crossIntensity * 10);
                    const crossWidth = star.radius * (0.3 + crossIntensity * 0.7);

                    ctx.save();
                    ctx.globalAlpha = crossAlpha;

                    // 水平光芒
                    const hGrad = ctx.createLinearGradient(
                        star.x - crossLen, star.y,
                        star.x + crossLen, star.y
                    );
                    hGrad.addColorStop(0, 'transparent');
                    hGrad.addColorStop(0.35, `hsla(${shiftedHue}, 30%, 85%, 1)`);
                    hGrad.addColorStop(0.5, `hsla(${shiftedHue}, 15%, 92%, 1)`);
                    hGrad.addColorStop(0.65, `hsla(${shiftedHue}, 30%, 85%, 1)`);
                    hGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = hGrad;
                    ctx.fillRect(star.x - crossLen, star.y - crossWidth, crossLen * 2, crossWidth * 2);

                    // 垂直光芒
                    const vGrad = ctx.createLinearGradient(
                        star.x, star.y - crossLen,
                        star.x, star.y + crossLen
                    );
                    vGrad.addColorStop(0, 'transparent');
                    vGrad.addColorStop(0.35, `hsla(${shiftedHue}, 30%, 85%, 1)`);
                    vGrad.addColorStop(0.5, `hsla(${shiftedHue}, 15%, 92%, 1)`);
                    vGrad.addColorStop(0.65, `hsla(${shiftedHue}, 30%, 85%, 1)`);
                    vGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = vGrad;
                    ctx.fillRect(star.x - crossWidth, star.y - crossLen, crossWidth * 2, crossLen * 2);

                    // 对角光芒（45°），更短更细
                    const diagLen = crossLen * 0.45;
                    const diagWidth = crossWidth * 0.5;
                    ctx.save();
                    ctx.translate(star.x, star.y);
                    ctx.rotate(Math.PI / 4);
                    const dGrad = ctx.createLinearGradient(-diagLen, 0, diagLen, 0);
                    dGrad.addColorStop(0, 'transparent');
                    dGrad.addColorStop(0.4, `hsla(${shiftedHue}, 25%, 82%, 0.7)`);
                    dGrad.addColorStop(0.5, `hsla(${shiftedHue}, 10%, 90%, 0.85)`);
                    dGrad.addColorStop(0.6, `hsla(${shiftedHue}, 25%, 82%, 0.7)`);
                    dGrad.addColorStop(1, 'transparent');
                    ctx.fillStyle = dGrad;
                    ctx.fillRect(-diagLen, -diagWidth, diagLen * 2, diagWidth * 2);
                    ctx.restore();

                    ctx.restore();
                }
            } else {
                const effLight = 68 + trailAlpha * 18;
                const effSat = Math.max(2, shiftedSat * 0.7);
                ctx.fillStyle = `hsla(${shiftedHue}, ${effSat}%, ${effLight}%, ${trailAlpha})`;
                ctx.fill();
            }
        }

        starAnimId = requestAnimationFrame(drawStars);
    }

    function initStarfield() {
        resizeCanvas();
        // 移动端减少粒子数量
        createStars(isMobile ? 100 : 200);
        if (starAnimId) cancelAnimationFrame(starAnimId);
        starAnimId = requestAnimationFrame(drawStars);
    }

    window.addEventListener('resize', debounce(initStarfield, 250));
    initStarfield();

    /* ============================================================
       NEBULA — 星云粒子层（宇宙尘埃流动）
       ============================================================ */
    const nebulaCanvas = document.getElementById('nebula');
    const nebulaCtx = nebulaCanvas.getContext('2d');
    let nebulaParticles = [];
    let nbw, nbh;
    let nebulaAnimId;

    function resizeNebula() {
        nbw = nebulaCanvas.width = window.innerWidth;
        nbh = nebulaCanvas.height = window.innerHeight;
    }

    function createNebula(count) {
        nebulaParticles = [];
        for (let i = 0; i < count; i++) {
            nebulaParticles.push({
                x: Math.random() * nbw,
                y: Math.random() * nbh,
                vx: (Math.random() - 0.5) * 0.15,
                vy: (Math.random() - 0.5) * 0.12 - 0.03,
                radius: Math.random() * 80 + 20,
                hue: Math.random() < 0.4 ? 250 : (Math.random() < 0.5 ? 270 : 190),
                alpha: Math.random() * 0.06 + 0.02,
                life: Math.random() * 500 + 300,
                age: Math.random() * 500,
            });
        }
    }

    function drawNebula() {
        if (!pageVisible) {
            nebulaAnimId = requestAnimationFrame(drawNebula);
            return;
        }

        nebulaCtx.clearRect(0, 0, nbw, nbh);

        for (const p of nebulaParticles) {
            p.x += p.vx;
            p.y += p.vy;
            p.age++;

            // 环绕边界
            if (p.x < -100) p.x = nbw + 100;
            if (p.x > nbw + 100) p.x = -100;
            if (p.y < -100) p.y = nbh + 100;
            if (p.y > nbh + 100) p.y = -100;

            // 生命值渐隐
            const lifeRatio = 1 - Math.abs(p.age - p.life / 2) / (p.life / 2);
            const currentAlpha = p.alpha * Math.max(0, lifeRatio);

            const gradient = nebulaCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            gradient.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${currentAlpha})`);
            gradient.addColorStop(0.5, `hsla(${p.hue}, 70%, 50%, ${currentAlpha * 0.4})`);
            gradient.addColorStop(1, 'transparent');

            nebulaCtx.beginPath();
            nebulaCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            nebulaCtx.fillStyle = gradient;
            nebulaCtx.fill();

            // 重生
            if (p.age > p.life) {
                p.x = Math.random() * nbw;
                p.y = Math.random() * nbh;
                p.age = 0;
            }
        }

        nebulaAnimId = requestAnimationFrame(drawNebula);
    }

    function initNebula() {
        resizeNebula();
        // 移动端减少星云粒子数量
        createNebula(isMobile ? 12 : 25);
        if (nebulaAnimId) cancelAnimationFrame(nebulaAnimId);
        nebulaAnimId = requestAnimationFrame(drawNebula);
    }

    window.addEventListener('resize', debounce(initNebula, 250));
    initNebula();

    /* ============================================================
       STAR DUST — 星空微尘（底部缓慢升起的极微小光点）
       ============================================================ */
    const dustCanvas = document.getElementById('starDust');
    const dustCtx = dustCanvas.getContext('2d');
    let dustParticles = [];
    let dw, dh;
    let dustAnimId;

    function resizeDust() {
        dw = dustCanvas.width = window.innerWidth;
        dh = dustCanvas.height = window.innerHeight;
    }

    function createDust(count) {
        dustParticles = [];
        for (let i = 0; i < count; i++) {
            dustParticles.push({
                x: Math.random() * dw,
                // 初始分布在整个屏幕高度，避免启动时空无一物
                y: Math.random() * dh,
                // 极其缓慢的上升速度
                vy: 0.08 + Math.random() * 0.35,
                // 微弱的水平漂移
                vx: (Math.random() - 0.5) * 0.12,
                // 极其微小
                radius: 0.3 + Math.random() * 0.9,
                // 极低透明度
                alpha: 0.025 + Math.random() * 0.09,
                // 色温：绝大多数冷白微蓝，极少数暖黄
                hue: Math.random() < 0.08 ? 35 + Math.random() * 20 : 205 + Math.random() * 40,
                sat: 8 + Math.random() * 15,
                light: 70 + Math.random() * 25,
                // 每颗粒子有微弱的闪烁脉动
                twinkleSpeed: 0.5 + Math.random() * 1.5,
                twinklePhase: Math.random() * Math.PI * 2,
            });
        }
    }

    function drawDust() {
        if (!pageVisible) {
            dustAnimId = requestAnimationFrame(drawDust);
            return;
        }

        dustCtx.clearRect(0, 0, dw, dh);

        for (const p of dustParticles) {
            // 缓慢上升 + 微弱水平漂移
            p.y -= p.vy;
            p.x += p.vx;
            p.twinklePhase += p.twinkleSpeed * 0.016;

            // 边界处理：到底部或越界时回绕到屏幕底部
            if (p.y < -20) {
                p.y = dh + 10;
                p.x = Math.random() * dw;
            }
            if (p.x < -20) p.x = dw + 20;
            if (p.x > dw + 20) p.x = -20;

            // 进入顶部区域时逐渐淡出（前15%高度为淡出区）
            const fadeOutRatio = Math.min(1, (p.y + 20) / (dh * 0.15 + 20));
            // 微小亮度脉动
            const twinkle = 1 + Math.sin(p.twinklePhase) * 0.25;
            const finalAlpha = p.alpha * fadeOutRatio * twinkle;

            if (finalAlpha < 0.002) continue;

            dustCtx.beginPath();
            dustCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            dustCtx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${finalAlpha})`;
            dustCtx.fill();
        }

        dustAnimId = requestAnimationFrame(drawDust);
    }

    function initDust() {
        resizeDust();
        // 移动端减少星尘粒子数量
        createDust(isMobile ? 60 : 120);
        if (dustAnimId) cancelAnimationFrame(dustAnimId);
        dustAnimId = requestAnimationFrame(drawDust);
    }

    window.addEventListener('resize', debounce(initDust, 250));
    initDust();

    /* ============================================================
       SPOTLIGHT — 鼠标聚光灯（仅桌面端）
       ============================================================ */
    const spotlight = document.getElementById('spotlight');

    if (isTouchDevice) {
        // 触屏设备完全禁用聚光灯
        spotlight.style.display = 'none';
    } else {
        let mouseX = -500;
        let mouseY = -500;
        let currentX = -500;
        let currentY = -500;
        let spotlightActive = false;
        let spotlightAnimId;

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            if (!spotlightActive) {
                spotlightActive = true;
                spotlightAnimId = requestAnimationFrame(animateSpotlight);
            }
        });

        document.addEventListener('mouseleave', function () {
            mouseX = -500;
            mouseY = -500;
            spotlightActive = false;
        });

        function animateSpotlight() {
            if (!spotlightActive) return;

            if (!pageVisible) {
                spotlightAnimId = requestAnimationFrame(animateSpotlight);
                return;
            }

            currentX += (mouseX - currentX) * 0.08;
            currentY += (mouseY - currentY) * 0.08;

            spotlight.style.transform = `translate(${currentX - 400}px, ${currentY - 400}px)`;

            spotlightAnimId = requestAnimationFrame(animateSpotlight);
        }
    }

    /* ============================================================
       REVEAL ON SCROLL — 滚动渐显
       ============================================================ */
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px',
    });

    revealElements.forEach(function (el) {
        observer.observe(el);
    });

    // Hero 区块的元素在页面加载时自动显示
    window.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('#hero .reveal').forEach(function (el) {
            el.classList.add('visible');
        });
    });

    /* ============================================================
       LAZY LOAD IMAGES — 图片懒加载
       ============================================================ */
    const lazyImages = document.querySelectorAll('img[data-src]');

    const imgObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
                imgObserver.unobserve(img);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '100px',
    });

    lazyImages.forEach(function (img) {
        imgObserver.observe(img);
    });

    /* ============================================================
       SITE NAVIGATION — 固定导航条：滚动高亮 + 下划线 + 移动端菜单
       ============================================================ */
    const siteNav = document.getElementById('siteNav');
    const navLinks = document.querySelectorAll('.nav-link');
    const navToggle = document.getElementById('navToggle');
    const navLinksList = document.getElementById('navLinks');
    const navIndicator = document.getElementById('navIndicator');

    // 获取所有导航对应的 section
    const navSections = [];
    navLinks.forEach(function (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            const section = document.getElementById(href.slice(1));
            if (section) navSections.push({ link: link, section: section });
        }
    });

    // ---- 滚动高亮 + 指示器定位 + 导航条背景 ---- */
    function updateNavActive() {
        const scrollY = window.scrollY;
        const navHeight = siteNav.offsetHeight;

        // 导航条背景变化
        if (scrollY > 60) {
            siteNav.classList.add('scrolled');
        } else {
            siteNav.classList.remove('scrolled');
        }

        // 确定当前激活的 section
        let activeLink = null;
        navSections.forEach(function (item) {
            const rect = item.section.getBoundingClientRect();
            if (rect.top <= navHeight + 100) {
                activeLink = item.link;
            }
        });

        // 如果页面在顶部，高亮第一个（#about）
        if (scrollY < 200) {
            activeLink = navSections.length > 0 ? navSections[0].link : null;
        }

        // 更新 active 类
        navLinks.forEach(function (link) {
            link.classList.remove('active');
        });
        if (activeLink) {
            activeLink.classList.add('active');
            // 更新指示器位置
            const linkRect = activeLink.getBoundingClientRect();
            const navRect = siteNav.getBoundingClientRect();
            if (window.innerWidth > 768) {
                navIndicator.classList.add('visible');
                navIndicator.style.left = (linkRect.left - navRect.left) + 'px';
                navIndicator.style.width = linkRect.width + 'px';
            }
        }
    }

    // 节流滚动监听
    let navScrollTicking = false;
    window.addEventListener('scroll', function () {
        if (!navScrollTicking) {
            requestAnimationFrame(function () {
                updateNavActive();
                navScrollTicking = false;
            });
            navScrollTicking = true;
        }
    });

    // 初始调用
    updateNavActive();

    // 窗口大小变化时重新计算指示器
    window.addEventListener('resize', debounce(updateNavActive, 200));

    // ---- 移动端汉堡菜单 ---- */
    if (navToggle && navLinksList) {
        navToggle.addEventListener('click', function () {
            const isOpen = navLinksList.classList.toggle('open');
            navToggle.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', isOpen.toString());
            // 防止背景滚动
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // 点击导航链接后关闭菜单
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                navLinksList.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // 点击菜单外部关闭
        document.addEventListener('click', function (e) {
            if (navLinksList.classList.contains('open') &&
                !navLinksList.contains(e.target) &&
                !navToggle.contains(e.target)) {
                navLinksList.classList.remove('open');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    /* ============================================================
       GLASS CARD MOUSE GLOW — 卡片鼠标光晕跟随
       ============================================================ */
    document.querySelectorAll('.glass-card').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });

    /* ============================================================
       ABOUT 卡片展开/收起 — 点击或触碰切换
       ============================================================ */
    const expandableCard = document.querySelector('.about-card-expandable');

    if (expandableCard) {
        // 阻止展开面板内部链接等元素的冒泡（预留扩展性）
        expandableCard.addEventListener('click', function (e) {
            // 如果点击的是链接或按钮等交互元素，不触发展开
            if (e.target.closest('a, button, input, textarea, select')) return;

            expandableCard.classList.toggle('expanded');

            // 展开后如果面板在视口外，滚动使其可见
            if (expandableCard.classList.contains('expanded')) {
                setTimeout(function () {
                    const panel = expandableCard.querySelector('.card-expand-panel');
                    if (panel) {
                        const panelRect = panel.getBoundingClientRect();
                        if (panelRect.bottom > window.innerHeight) {
                            expandableCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    }
                }, 350);
            }
        });

        // 键盘无障碍：Enter / Space 触发
        expandableCard.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                expandableCard.click();
            }
        });

        // 使卡片可聚焦，支持键盘导航
        expandableCard.setAttribute('tabindex', '0');
        expandableCard.setAttribute('role', 'button');
        expandableCard.setAttribute('aria-expanded', 'false');

        // 同步 aria 状态
        const ariaObserver = new MutationObserver(function () {
            const isExpanded = expandableCard.classList.contains('expanded');
            expandableCard.setAttribute('aria-expanded', isExpanded.toString());
        });
        ariaObserver.observe(expandableCard, { attributes: true, attributeFilter: ['class'] });
    }

    // 开发环境日志（生产环境可安全移除）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🚀 Chaniug 个人主页已就绪 — Moonshot Style');
    }
})();
