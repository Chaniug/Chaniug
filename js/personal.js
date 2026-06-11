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

    // 页面可见性管理 — 切后台时彻底暂停 Canvas 动画
    let pageVisible = true;
    document.addEventListener('visibilitychange', function () {
        pageVisible = !document.hidden;
        if (pageVisible) {
            // 页面恢复可见：重启所有 Canvas 动画（仅当 ID 为 null 时才重启）
            if (!starAnimId) {
                starAnimId = requestAnimationFrame(drawStars);
            }
            if (!nebulaAnimId) {
                nebulaAnimId = requestAnimationFrame(drawNebula);
            }
            if (!dustAnimId) {
                dustAnimId = requestAnimationFrame(drawDust);
            }
        } else {
            // 页面不可见：彻底停止所有 Canvas 动画
            if (starAnimId) { cancelAnimationFrame(starAnimId); starAnimId = null; }
            if (nebulaAnimId) { cancelAnimationFrame(nebulaAnimId); nebulaAnimId = null; }
            if (dustAnimId) { cancelAnimationFrame(dustAnimId); dustAnimId = null; }
        }
    });

    // 检测用户是否开启了系统「减少动画」设置
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function handleMotionPreference(e) {
        if (e.matches) {
            // 暂停所有 Canvas 动画
            if (starAnimId) { cancelAnimationFrame(starAnimId); starAnimId = null; }
            if (nebulaAnimId) { cancelAnimationFrame(nebulaAnimId); nebulaAnimId = null; }
            if (dustAnimId) { cancelAnimationFrame(dustAnimId); dustAnimId = null; }
            // 暂停所有轮播自动播放
            document.querySelectorAll('.hero-slideshow').forEach(function (s) {
                if (s._pauseAutoPlay) s._pauseAutoPlay();
            });
        } else {
            // 恢复动画（仅当页面可见时）
            if (pageVisible) {
                if (!starAnimId) starAnimId = requestAnimationFrame(drawStars);
                if (!nebulaAnimId) nebulaAnimId = requestAnimationFrame(drawNebula);
                if (!dustAnimId) dustAnimId = requestAnimationFrame(drawDust);
            }
        }
    }
    prefersReducedMotion.addEventListener('change', handleMotionPreference);

    /* ============================================================
       HERO SLIDESHOW — 全宽文字+图片整体轮播
       ============================================================ */
    const slideshows = document.querySelectorAll('.hero-slideshow');

    slideshows.forEach(function (slideshow) {
        const track = slideshow.querySelector('.hero-slideshow-track');
        const slides = slideshow.querySelectorAll('.hero-slide');
        const prevBtn = slideshow.parentElement.querySelector('.carousel-dots .carousel-prev');
        const nextBtn = slideshow.parentElement.querySelector('.carousel-dots .carousel-next');
        const dotsContainer = (slideshow.parentElement.querySelector('.carousel-dots-inner')) || slideshow.parentElement.querySelector('.carousel-dots') || slideshow.querySelector('.carousel-dots');

        if (!track || slides.length === 0) return;

        let currentIndex = 0;
        let autoPlayTimer;
        let autoPlayStarted = false;
        const totalSlides = slides.length;

        // 每张幻灯片独立停留时长（毫秒），营造节奏感
        // Slide 1（个人简介）：主要内容，适中 → 9000ms
        // Slide 2（探索1+2）：简洁卡片 → 7000ms
        // Slide 3（探索3+4）：延续 → 8000ms
        const SLIDE_DURATIONS = [9000, 8000, 8000];

        // Slide 1 逐行展开相关
        const slide1Text = slides[0] ? slides[0].querySelector('.hero-slide-text') : null;
        const slide1Image = slides[0] ? slides[0].querySelector('.hero-slide-image') : null;
        let autoColorTimer = null;

        function resetSlide1Animation() {
            if (!slide1Text) return;
            ['hero-name-large', 'hero-name', 'hero-role', 'hero-tagline'].forEach(function (cls) {
                var el = slide1Text.querySelector('.' + cls);
                if (el) el.classList.remove('line-visible');
            });
            if (slide1Image) {
                slide1Image.classList.remove('image-visible', 'auto-revealed');
            }
            if (autoColorTimer) {
                clearTimeout(autoColorTimer);
                autoColorTimer = null;
            }
        }

        function animateSlide1Lines() {
            if (!slide1Text) return;

            const nameEl = slide1Text.querySelector('.hero-name-large') || slide1Text.querySelector('.hero-name');
            const roleEl = slide1Text.querySelector('.hero-role');
            const taglineEl = slide1Text.querySelector('.hero-tagline');
            const headerRow = slide1Text.querySelector('.hero-header-row');

            if (headerRow) {
                headerRow.classList.add('header-visible');
            }

            // 优雅非对称节拍：header → name(120ms) → role(300ms) → tagline(520ms) → image(880ms)
            // 间隔递增（120→180→200→360）营造"加速阅读感"，避免机械等距
            if (nameEl) {
                setTimeout(function () {
                    nameEl.classList.add('line-visible');
                }, 120);
            }

            if (roleEl) {
                setTimeout(function () {
                    roleEl.classList.add('line-visible');
                }, 300);
            }

            if (taglineEl) {
                setTimeout(function () {
                    taglineEl.classList.add('line-visible');
                }, 520);
            }

            if (slide1Image) {
                setTimeout(function () {
                    slide1Image.classList.add('image-visible');
                    // 图片出现 3.2s 后自动显色，避免长时间灰色
                    autoColorTimer = setTimeout(function () {
                        if (slide1Image) slide1Image.classList.add('auto-revealed');
                    }, 3200);
                }, 880);
            }
        }

        // 创建底部圆点
        if (dotsContainer) {
            for (let i = 0; i < totalSlides; i++) {
                const dot = document.createElement('button');
                dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
                dot.setAttribute('aria-label', 'Slide ' + (i + 1));
                dot.addEventListener('click', function () {
                    goToSlide(i);
                    resetAutoPlay();
                });
                dotsContainer.appendChild(dot);
            }
        }

        const dots = dotsContainer ? dotsContainer.querySelectorAll('.carousel-dot') : [];

        function goToSlide(index) {
            currentIndex = index;
            track.style.transform = 'translateX(-' + (index * 100) + '%)';

            // 更新底部圆点
            if (dots.length > 0) {
                dots.forEach(function (d, i) {
                    d.classList.toggle('active', i === index);
                });
            }

            // slide-active 类管理 + 内容渐入动画
            slides.forEach(function (s, i) {
                var st = s.querySelector('.hero-slide-text');
                if (i === index) {
                    s.classList.add('slide-active');

                    // 激活当前 slide 的 header
                    var hr = s.querySelector('.hero-header-row');
                    if (hr) hr.classList.add('header-visible');

                    // Slide 2：节拍式文字出场 → 水印动画 → 毛玻璃消退
                    if (st && index === 1) {
                        var nameEl2 = st.querySelector('.hero-name-large');
                        var roleEl2 = st.querySelector('.hero-role');
                        var taglineEl2 = st.querySelector('.hero-tagline');

                        if (nameEl2) setTimeout(function () { nameEl2.classList.add('line-visible'); }, 100);
                        if (roleEl2) setTimeout(function () { roleEl2.classList.add('line-visible'); }, 280);
                        if (taglineEl2) setTimeout(function () { taglineEl2.classList.add('line-visible'); }, 500);

                        // 毛玻璃与文字抬升同步进行（~5.85s，与 role shift-up 同期）
                        var imgWrap = s.querySelector('.gallery-image-wrapper');
                        if (imgWrap) {
                            imgWrap.classList.remove('glass-revealed');
                            setTimeout(function () {
                                imgWrap.classList.add('glass-revealed');
                            }, 5850);
                        }
                    }

                    // Slide 3：name/role/tagline + 拼图式图片揭示
                    if (st && index > 1) {
                        ['hero-name-large', 'hero-role', 'hero-tagline'].forEach(function (cls) {
                            var el = st.querySelector('.' + cls);
                            if (el) el.classList.add('line-visible');
                        });

                        // image-mosaic：4×4 拼图逐块揭示
                        var imgWrap3 = s.querySelector('.gallery-image-wrapper');
                        if (imgWrap3) {
                            // 清除旧瓦片
                            var oldTiles = imgWrap3.querySelectorAll('.mosaic-tile');
                            oldTiles.forEach(function (t) { t.remove(); });
                            imgWrap3.classList.remove('mosaic-done');

                            // 百分比定位，不依赖 getBoundingClientRect
                            var tiles = [];
                            var tileOrder = [];

                            for (var row = 0; row < 4; row++) {
                                for (var col = 0; col < 4; col++) {
                                    var tile = document.createElement('div');
                                    tile.className = 'mosaic-tile';
                                    tile.style.left = (col * 25) + '%';
                                    tile.style.top = (row * 25) + '%';
                                    tile.style.width = '25%';
                                    tile.style.height = '25%';
                                    imgWrap3.appendChild(tile);
                                    tiles.push(tile);
                                    tileOrder.push({ tile: tile, idx: row * 4 + col });
                                }
                            }

                            // Fisher-Yates 洗牌，实现随机逐块揭示
                            for (var k = tileOrder.length - 1; k > 0; k--) {
                                var j = Math.floor(Math.random() * (k + 1));
                                var tmp = tileOrder[k];
                                tileOrder[k] = tileOrder[j];
                                tileOrder[j] = tmp;
                            }

                            // 逐块揭示，每块间隔 80ms
                            setTimeout(function () {
                                tileOrder.forEach(function (item, ti) {
                                    setTimeout(function () {
                                        item.tile.classList.add('revealed');
                                        // 最后一块揭示后标记完成
                                        if (ti === tileOrder.length - 1) {
                                            setTimeout(function () {
                                                imgWrap3.classList.add('mosaic-done');
                                            }, 300);
                                        }
                                    }, ti * 80);
                                });
                            }, 300);
                        }
                    }

                    // Slide 2/3：交错展示 detail 条目
                    var details = s.querySelectorAll('.hero-detail-item');
                    if (details.length > 0) {
                        details.forEach(function (d) { d.classList.remove('detail-visible'); });
                        details.forEach(function (d, di) {
                            setTimeout(function () {
                                d.classList.add('detail-visible');
                            }, 250 + di * 120);
                        });
                    }
                } else {
                    s.classList.remove('slide-active');
                    var hr = s.querySelector('.hero-header-row');
                    if (hr) hr.classList.remove('header-visible');

                    // 切走时隐藏 name/role/tagline（避免切回时残留状态）
                    if (st && i !== 0) {
                        ['hero-name-large', 'hero-role', 'hero-tagline'].forEach(function (cls) {
                            var el = st.querySelector('.' + cls);
                            if (el) el.classList.remove('line-visible');
                        });
                    }

                    // 切走时重置毛玻璃（Slide 2）/ 拼图瓦片（Slide 3）
                    if (i === 1) {
                        var imgWrap = s.querySelector('.gallery-image-wrapper');
                        if (imgWrap) imgWrap.classList.remove('glass-revealed');
                    }
                    if (i === 2) {
                        var imgWrap3 = s.querySelector('.gallery-image-wrapper');
                        if (imgWrap3) {
                            imgWrap3.classList.remove('mosaic-done');
                            var tiles = imgWrap3.querySelectorAll('.mosaic-tile');
                            tiles.forEach(function (t) { t.remove(); });
                        }
                    }
                }
            });

            // 每次回到 Slide 1 时重新播放逐行动画
            if (index === 0 && slide1Text) {
                resetSlide1Animation();
                setTimeout(function () {
                    animateSlide1Lines();
                }, 250);
            }
        }

        function nextSlide() {
            goToSlide((currentIndex + 1) % totalSlides);
        }

        function prevSlide() {
            goToSlide((currentIndex - 1 + totalSlides) % totalSlides);
        }

        function getCurrentDuration() {
            return SLIDE_DURATIONS[currentIndex] || 8000;
        }

        function scheduleNext() {
            clearTimeout(autoPlayTimer);
            if (autoPlayStarted) {
                autoPlayTimer = setTimeout(function () {
                    nextSlide();
                    scheduleNext();
                }, getCurrentDuration());
            }
        }

        function resetAutoPlay() {
            scheduleNext();
        }

        function startAutoPlay() {
            if (!autoPlayStarted) {
                autoPlayStarted = true;
                scheduleNext();
            }
        }

        // 箭头按钮
        if (prevBtn) prevBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            prevSlide();
            resetAutoPlay();
        });
        if (nextBtn) nextBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            nextSlide();
            resetAutoPlay();
        });

        // 触摸滑动支持
        let touchStartX = 0;
        let touchEndX = 0;

        slideshow.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slideshow.addEventListener('touchend', function (e) {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
                resetAutoPlay();
            }
        });

        // 鼠标进入暂停自动播放
        slideshow.addEventListener('mouseenter', function () {
            clearTimeout(autoPlayTimer);
        });
        slideshow.addEventListener('mouseleave', function () {
            if (autoPlayStarted) {
                scheduleNext();
            }
        });

        // 轮播暂停/播放按钮
        var pauseBtn = slideshow.parentElement.querySelector('.carousel-pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var isPaused = this.getAttribute('aria-pressed') === 'true';
                var pauseIcon = this.querySelector('.pause-icon');
                var playIcon = this.querySelector('.play-icon');
                if (isPaused) {
                    slideshow._resumeAutoPlay();
                    this.setAttribute('aria-pressed', 'false');
                    this.setAttribute('aria-label', '暂停轮播');
                    pauseIcon.style.display = '';
                    playIcon.style.display = 'none';
                } else {
                    slideshow._pauseAutoPlay();
                    this.setAttribute('aria-pressed', 'true');
                    this.setAttribute('aria-label', '播放轮播');
                    pauseIcon.style.display = 'none';
                    playIcon.style.display = '';
                }
            });
        }

        // 暴露控制方法供外部调用
        slideshow._startAutoPlay = startAutoPlay;
        slideshow._pauseAutoPlay = function () {
            clearTimeout(autoPlayTimer);
        };
        slideshow._resumeAutoPlay = function () {
            if (autoPlayStarted) {
                scheduleNext();
            }
        };
        // 暴露动画方法供轮播回到 Slide 1 时使用
        slideshow._resetSlide1Animation = resetSlide1Animation;
        slideshow._animateSlide1Lines = animateSlide1Lines;

        // 初始状态：Slide 1 激活
        if (slides[0]) {
            slides[0].classList.add('slide-active');
        }

        // 初始触发 Slide 1 逐行动画（如果 slideshow 一开始就可见）
        if (slide1Text) {
            animateSlide1Lines();
        }
    });

    /* ============================================================
       ABOUT HERO — 卡片可见后逐行展开文字 + 启动轮播
       视口离开时暂停轮播，避免后台空转发热
       ============================================================ */
    const aboutHeroCard = document.querySelector('.about-card-hero');
    if (aboutHeroCard) {
        const heroSlideshow = aboutHeroCard.querySelector('.hero-slideshow');
        let heroAnimated = false;
        let carouselStarted = false;

        const heroObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // 入场：首次启动文字动画 + 轮播
                    if (!heroAnimated) {
                        heroAnimated = true;
                        // 文字动画完成后（约 1.6s）再启动轮播
                        setTimeout(function () {
                            if (heroSlideshow && heroSlideshow._startAutoPlay) {
                                heroSlideshow._startAutoPlay();
                                carouselStarted = true;
                            }
                        }, 1800);
                    } else if (carouselStarted && heroSlideshow && heroSlideshow._resumeAutoPlay) {
                        // 重新入场：恢复轮播
                        heroSlideshow._resumeAutoPlay();
                    }
                } else {
                    // 离开视口：暂停轮播
                    if (carouselStarted && heroSlideshow && heroSlideshow._pauseAutoPlay) {
                        heroSlideshow._pauseAutoPlay();
                    }
                }
            });
        }, {
            threshold: 0.1,
        });

        heroObserver.observe(aboutHeroCard);
    }

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
        // 限制 Canvas 尺寸，避免在高分辨率屏幕上过大导致性能问题
        width = canvas.width = Math.min(window.innerWidth, 1920);
        height = canvas.height = Math.min(window.innerHeight, 1080);
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
        // 限制 Canvas 尺寸
        nbw = nebulaCanvas.width = Math.min(window.innerWidth, 1920);
        nbh = nebulaCanvas.height = Math.min(window.innerHeight, 1080);
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

    // 初始检测系统动画偏好（必须在变量声明之后调用，避免 TDZ）
    handleMotionPreference(prefersReducedMotion);

    function resizeDust() {
        // 限制 Canvas 尺寸
        dw = dustCanvas.width = Math.min(window.innerWidth, 1920);
        dh = dustCanvas.height = Math.min(window.innerHeight, 1080);
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
        let mouseMoveThrottle;

        document.addEventListener('mousemove', function (e) {
            // 节流：约 60fps，避免过于频繁地更新坐标
            if (mouseMoveThrottle) return;
            mouseMoveThrottle = setTimeout(function () {
                mouseMoveThrottle = null;
                mouseX = e.clientX;
                mouseY = e.clientY;
                if (!spotlightActive) {
                    spotlightActive = true;
                    spotlightAnimId = requestAnimationFrame(animateSpotlight);
                }
            }, 16);
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
       C3: 优化节奏 + section 标题特殊入场
       ============================================================ */
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // C3: section 内标题特殊入场
                const section = entry.target.closest('.section');
                if (section) {
                    section.classList.add('reveal-done');
                }
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
       SKILLS CONSTELLATION — 动态漂浮技能星图
       ============================================================ */
    const constellation = document.getElementById('skills-constellation');
    if (constellation) {
        const canvas = constellation.querySelector('.constellation-canvas');
        const nodesContainer = document.getElementById('constellation-nodes');
        const nodes = nodesContainer ? nodesContainer.querySelectorAll('.constellation-node') : [];
        const ctx = canvas ? canvas.getContext('2d') : null;
        let nodeData = [];    // { baseX, baseY, curX, curY, driftAngle, driftSpeed, driftAmpX, driftAmpY, category, el }
        let edgeList = [];
        let hoveredIndex = -1;
        let frameId = null;
        let tick = 0;
        let containerW = 0, containerH = 0;
        let constellationActive = false;
        let returnTimer = null;

        // 分类颜色映射
        const categoryColors = {
            lang:   { r: 79,  g: 140, b: 255 },
            fe:     { r: 34,  g: 211, b: 238 },
            be:     { r: 168, g: 85,  b: 247 },
            devops: { r: 192, g: 132, b: 252 },
            ai:     { r: 34,  g: 211, b: 238 }
        };

        // 连线配置
        function buildEdgeList() {
            var edges = [];
            for (var i = 0; i < nodeData.length; i++) {
                for (var j = i + 1; j < nodeData.length; j++) {
                    if (nodeData[i].category === nodeData[j].category) {
                        edges.push({ a: i, b: j, sameCategory: true });
                    }
                }
            }
            var crossEdges = [
                [0, 5], [2, 5], [3, 6], [5, 6],
                [6, 8], [7, 8], [1, 9], [9, 10],
                [11, 5], [12, 7], [13, 6],
            ];
            crossEdges.forEach(function (pair) {
                var a = pair[0], b = pair[1];
                if (a < nodeData.length && b < nodeData.length) {
                    edges.push({ a: a, b: b, sameCategory: false });
                }
            });
            return edges;
        }

        // 粒子系统（沿连线流动的光点）
        var particles = [];
        const MAX_PARTICLES = 18;

        function spawnParticle() {
            if (edgeList.length === 0) return null;
            var edge = edgeList[Math.floor(Math.random() * edgeList.length)];
            var a = nodeData[edge.a], b = nodeData[edge.b];
            if (!a || !b) return null;
            var cat = a.category;
            var col = categoryColors[cat] || { r: 180, g: 180, b: 200 };
            return {
                edgeA: edge.a, edgeB: edge.b,
                t: Math.random(),            // 0→1 沿线段位置
                speed: 0.002 + Math.random() * 0.005,
                size: 1.2 + Math.random() * 2.0,
                alpha: 0.4 + Math.random() * 0.5,
                r: col.r, g: col.g, b: col.b,
                sameCategory: edge.sameCategory
            };
        }

        // 初始化/重新计算节点基础位置
        function computeBasePositions() {
            var rect = constellation.getBoundingClientRect();
            var w = rect.width;
            var h = rect.height;
            containerW = w;
            containerH = h;
            var cx = w / 2;
            var cy = h / 2;
            var count = nodes.length;
            var rx = w * 0.38;
            var ry = h * 0.38;

            // 保留旧的 drift 参数（如果存在）
            var oldDrifts = [];
            nodeData.forEach(function (nd) {
                oldDrifts.push({
                    driftAngle: nd.driftAngle,
                    driftSpeed: nd.driftSpeed,
                    driftAmpX: nd.driftAmpX,
                    driftAmpY: nd.driftAmpY
                });
            });

            nodeData = [];
            nodes.forEach(function (node, i) {
                var angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                var offsetX = Math.cos(i * 2.7) * rx * 0.04;
                var offsetY = Math.sin(i * 3.1) * ry * 0.04;
                var bx = cx + Math.cos(angle) * rx + offsetX;
                var by = cy + Math.sin(angle) * ry + offsetY;

                // 漂移参数：首次随机生成，resize 时复用
                var drift;
                if (i < oldDrifts.length) {
                    drift = oldDrifts[i];
                } else {
                    drift = {
                        driftAngle: Math.random() * Math.PI * 2,
                        driftSpeed: 0.004 + Math.random() * 0.01,
                        driftAmpX: 8 + Math.random() * 16,
                        driftAmpY: 6 + Math.random() * 12
                    };
                }

                nodeData.push({
                    baseX: bx, baseY: by,
                    curX: bx, curY: by,
                    originalBaseX: bx, originalBaseY: by,
                    driftAngle: drift.driftAngle,
                    driftSpeed: drift.driftSpeed,
                    driftAmpX: drift.driftAmpX,
                    driftAmpY: drift.driftAmpY,
                    category: node.getAttribute('data-category') || '',
                    el: node,
                    returning: false
                });
            });

            edgeList = buildEdgeList();
            // 补充粒子
            while (particles.length < MAX_PARTICLES) {
                var p = spawnParticle();
                if (p) particles.push(p);
            }
        }

        // 边界余量：确保节点标签不被边缘裁剪
        var driftMarginX = 70;
        var driftMarginY = 50;

        // 更新节点实时位置（漂浮漂移）
        function updateDrift() {
            nodeData.forEach(function (nd, i) {
                // 拖拽中的节点跳过漂移，位置由 mousemove 直接控制
                if (i === dragIndex && isDragging) return;
                if (nd.returning) return; // 归位中的节点也跳过漂移
                var dx = Math.cos(nd.driftAngle + tick * nd.driftSpeed) * nd.driftAmpX;
                var dy = Math.sin(nd.driftAngle + tick * nd.driftSpeed * 1.3) * nd.driftAmpY;
                var nx = nd.baseX + dx;
                var ny = nd.baseY + dy;
                // 软边界约束（反弹式）
                if (nx < driftMarginX) nx = driftMarginX + (driftMarginX - nx) * 0.5;
                if (nx > containerW - driftMarginX) nx = containerW - driftMarginX - (nx - (containerW - driftMarginX)) * 0.5;
                if (ny < driftMarginY) ny = driftMarginY + (driftMarginY - ny) * 0.5;
                if (ny > containerH - driftMarginY) ny = containerH - driftMarginY - (ny - (containerH - driftMarginY)) * 0.5;
                nd.curX = nx;
                nd.curY = ny;
                // 更新 DOM 位置
                nd.el.style.left = nx + 'px';
                nd.el.style.top = ny + 'px';
            });
        }

        // 更新粒子
        function updateParticles() {
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.t += p.speed;
                if (p.t >= 1) {
                    // 粒子到达终点，重新生成
                    var np = spawnParticle();
                    if (np) particles[i] = np;
                    else particles.splice(i, 1);
                }
            }
            while (particles.length < MAX_PARTICLES) {
                var np = spawnParticle();
                if (np) particles.push(np);
                else break;
            }
        }

        // Canvas 尺寸匹配容器
        function resizeCanvas() {
            if (!canvas) return;
            var dpr = window.devicePixelRatio || 1;
            var rect = constellation.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = rect.width + 'px';
            canvas.style.height = rect.height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            computeBasePositions();
        }

        // 绘制连线 + 粒子
        function drawAll(hoverIdx) {
            if (!ctx) return;
            var w = containerW || constellation.getBoundingClientRect().width;
            var h = containerH || constellation.getBoundingClientRect().height;
            ctx.clearRect(0, 0, w, h);

            var phase = tick * 0.02;

            // 绘制连线
            edgeList.forEach(function (edge) {
                var a = nodeData[edge.a];
                var b = nodeData[edge.b];
                if (!a || !b) return;

                var isHovered = (hoverIdx === edge.a || hoverIdx === edge.b);
                var isSameCat = edge.sameCategory;

                var alpha, width, colorObj;
                if (isHovered) {
                    alpha = 0.7;
                    width = 1.6;
                    colorObj = categoryColors[a.category] || categoryColors[b.category] || { r: 200, g: 200, b: 200 };
                } else if (isSameCat) {
                    alpha = 0.2 + Math.sin(phase + edge.a * 0.5) * 0.08;
                    width = 0.7;
                    colorObj = categoryColors[a.category] || { r: 150, g: 150, b: 150 };
                } else {
                    alpha = 0.06 + Math.sin(phase + edge.a * 0.3) * 0.03;
                    width = 0.4;
                    colorObj = { r: 150, g: 155, b: 170 };
                }

                var pulse = 1 + Math.sin(phase * 0.6 + edge.a + edge.b) * 0.12;
                var finalAlpha = alpha * pulse;

                ctx.beginPath();
                ctx.moveTo(a.curX, a.curY);
                ctx.lineTo(b.curX, b.curY);
                ctx.strokeStyle = 'rgba(' + colorObj.r + ',' + colorObj.g + ',' + colorObj.b + ',' + finalAlpha.toFixed(3) + ')';
                ctx.lineWidth = width;
                ctx.stroke();
            });

            // 绘制流动粒子
            particles.forEach(function (p) {
                var a = nodeData[p.edgeA];
                var b = nodeData[p.edgeB];
                if (!a || !b) return;
                var px = a.curX + (b.curX - a.curX) * p.t;
                var py = a.curY + (b.curY - a.curY) * p.t;

                // 接近 hover 节点的粒子更亮
                var glowAlpha = p.alpha;
                if (hoverIdx >= 0 && (hoverIdx === p.edgeA || hoverIdx === p.edgeB)) {
                    glowAlpha = Math.min(1, p.alpha * 1.6);
                }
                // 粒子呼吸微动 - 降低脉冲频率，减少闪光
                glowAlpha *= 0.75 + Math.sin(phase * 1.2 + p.t * 6) * 0.25;

                ctx.beginPath();
                ctx.arc(px, py, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + glowAlpha.toFixed(3) + ')';
                ctx.fill();

                // 外层光晕
                ctx.beginPath();
                ctx.arc(px, py, p.size * 2.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + (glowAlpha * 0.2).toFixed(3) + ')';
                ctx.fill();
            });
        }

        // 归位动画：拖动松手后缓慢回到原位
        function updateReturn() {
            var lerpFactor = 0.04;
            nodeData.forEach(function (nd) {
                if (!nd.returning) return;
                nd.baseX += (nd.originalBaseX - nd.baseX) * lerpFactor;
                nd.baseY += (nd.originalBaseY - nd.baseY) * lerpFactor;
                if (Math.abs(nd.baseX - nd.originalBaseX) < 0.4 &&
                    Math.abs(nd.baseY - nd.originalBaseY) < 0.4) {
                    nd.baseX = nd.originalBaseX;
                    nd.baseY = nd.originalBaseY;
                    nd.returning = false;
                }
            });
        }

        // 动画循环
        function animate() {
            tick++;
            updateReturn();
            updateDrift();
            updateParticles();
            drawAll(hoveredIndex);
            frameId = requestAnimationFrame(animate);
        }

        // 拖拽状态
        var dragIndex = -1;
        var isDragging = false;
        var dragStartX = 0, dragStartY = 0;
        var dragNodeBaseX = 0, dragNodeBaseY = 0;

        // 节点事件：hover + 拖拽
        nodes.forEach(function (node, i) {
            node.addEventListener('mouseenter', function () {
                if (!isDragging) hoveredIndex = i;
            });
            node.addEventListener('mouseleave', function () {
                if (!isDragging) hoveredIndex = -1;
            });
            node.addEventListener('mousedown', function (e) {
                e.preventDefault();
                clearTimeout(returnTimer);
                dragIndex = i;
                isDragging = true;
                hoveredIndex = i;
                var nd = nodeData[i];
                nd.returning = false;
                dragNodeBaseX = nd.baseX;
                dragNodeBaseY = nd.baseY;
                var rect = constellation.getBoundingClientRect();
                dragStartX = e.clientX - rect.left;
                dragStartY = e.clientY - rect.top;
                nd.el.style.transition = 'none';
                nd.el.style.cursor = 'grabbing';
            });
            // 设置可拖拽提示
            node.style.cursor = 'grab';
        });

        // 全局 mousemove（拖拽时跟随）
        document.addEventListener('mousemove', function (e) {
            if (!isDragging || dragIndex < 0) return;
            var nd = nodeData[dragIndex];
            if (!nd) return;
            var rect = constellation.getBoundingClientRect();
            var mx = e.clientX - rect.left;
            var my = e.clientY - rect.top;
            var dx = mx - dragStartX;
            var dy = my - dragStartY;

            nd.baseX = dragNodeBaseX + dx;
            nd.baseY = dragNodeBaseY + dy;
            nd.curX = nd.baseX;
            nd.curY = nd.baseY;

            // 软边界
            var dragMargin = 60;
            if (nd.baseX < dragMargin) nd.baseX = nd.curX = dragMargin;
            if (nd.baseX > containerW - dragMargin) nd.baseX = nd.curX = containerW - dragMargin;
            if (nd.baseY < dragMargin) nd.baseY = nd.curY = dragMargin;
            if (nd.baseY > containerH - dragMargin) nd.baseY = nd.curY = containerH - dragMargin;

            nd.el.style.left = nd.curX + 'px';
            nd.el.style.top = nd.curY + 'px';
        });

        // 全局 mouseup（结束拖拽 + 延迟归位）
        document.addEventListener('mouseup', function () {
            if (!isDragging) return;
            var nd = nodeData[dragIndex];
            var idx = dragIndex;
            if (nd) {
                nd.el.style.transition = '';
                nd.el.style.cursor = 'grab';
            }
            isDragging = false;
            dragIndex = -1;
            // 2 秒后自动吸附回原位
            clearTimeout(returnTimer);
            if (idx >= 0 && nodeData[idx]) {
                returnTimer = setTimeout(function () {
                    if (!isDragging && nodeData[idx]) {
                        nodeData[idx].returning = true;
                    }
                }, 2000);
            }
        });

        // ===== Big Bang 激活 / 坍塌 流程 =====
        var isCollapsing = false;

        // 初始状态：星子聚在中心、不可见
        function initConstellation() {
            resizeCanvas(); // 计算位置数据 + 设置 Canvas
            var cx = containerW / 2;
            var cy = containerH / 2;
            nodeData.forEach(function (nd) {
                nd.curX = cx;
                nd.curY = cy;
                nd.el.style.left = cx + 'px';
                nd.el.style.top = cy + 'px';
            });
        }

        // 点击核心 → 大爆炸展开
        function activateConstellation() {
            var staggerTime = 60;
            nodeData.forEach(function (nd, i) {
                setTimeout(function () {
                    nd.curX = nd.baseX;
                    nd.curY = nd.baseY;
                    nd.el.style.left = nd.baseX + 'px';
                    nd.el.style.top = nd.baseY + 'px';
                }, i * staggerTime + 40);
            });
            var totalDelay = nodeData.length * staggerTime + 180;
            setTimeout(function () {
                tick = 0;
                if (!frameId) animate();
            }, totalDelay);
        }

        // 收拢星子 → 坍塌回中心
        function deactivateConstellation(callback) {
            isCollapsing = true;
            constellation.classList.add('collapsing');
            if (toggleBtn) toggleBtn.classList.add('collapsing-state');
            
            // 停止动画循环
            if (frameId) {
                cancelAnimationFrame(frameId);
                frameId = null;
            }
            
            // 清空粒子和画布 - 使用 requestAnimationFrame 确保清除完成
            particles = [];
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            
            // Canvas 淡出 - 使用 CSS class 而非直接操作 style，避免冲突
            canvas.classList.add('fading-out');
            
            // 计算中心点 - 使用 offsetWidth/Height 而非 getBoundingClientRect
            var cx = constellation.offsetWidth / 2;
            var cy = constellation.offsetHeight / 2;
            
            var staggerTime = 50;
            // 反向 stagger：最后一个节点最先回来
            nodeData.forEach(function (nd, i) {
                var delay = (nodeData.length - 1 - i) * staggerTime;
                setTimeout(function () {
                    // 使用 transform 而非直接设置 left/top，避免重排抖动
                    nd.curX = cx;
                    nd.curY = cy;
                    nd.el.style.left = cx + 'px';
                    nd.el.style.top = cy + 'px';
                    nd.returning = false;
                }, delay);
            });
            
            var totalDuration = nodeData.length * staggerTime + 250;
            setTimeout(function () {
                constellation.classList.remove('active', 'collapsing');
                constellationActive = false;
                isCollapsing = false;
                if (toggleBtn) toggleBtn.classList.remove('collapsing-state');
                // 更新按钮文案
                updateToggleText();
                // 回到初始聚拢状态
                initConstellation();
                // Canvas 恢复 - 移除 class
                canvas.classList.remove('fading-out');
                if (callback) callback();
            }, totalDuration);
        }

        // 更新按钮文案和状态
        var toggleBtn = document.getElementById('constellation-toggle');
        function updateToggleText() {
            if (!toggleBtn) return;
            var toggleText = toggleBtn.querySelector('.toggle-text');
            if (constellationActive) {
                if (toggleText) toggleText.textContent = '收拢星子';
                toggleBtn.setAttribute('aria-label', '收拢星图');
                toggleBtn.classList.add('active-state');
            } else {
                if (toggleText) toggleText.textContent = '点击星核 · 展开星图';
                toggleBtn.setAttribute('aria-label', '展开星图');
                toggleBtn.classList.remove('active-state');
            }
        }

        // 核心点击事件
        var coreEl = constellation.querySelector('.constellation-core');
        var lastTouchTime = 0;
        
        function handleExpand() {
            if (constellationActive || isCollapsing) return;
            constellationActive = true;
            constellation.classList.add('active');
            updateToggleText();
            activateConstellation();
        }
        
        if (coreEl) {
            // 移动端只使用 touchstart，避免 click 和 touchstart 同时触发
            if (isTouchDevice) {
                coreEl.addEventListener('touchstart', function (e) {
                    if (constellationActive || isCollapsing) return;
                    // 防止快速双击
                    var now = Date.now();
                    if (now - lastTouchTime < 500) return;
                    lastTouchTime = now;
                    e.preventDefault();
                    handleExpand();
                }, { passive: false });
            } else {
                coreEl.addEventListener('click', handleExpand);
            }
        }

        // 切换按钮事件 - 移动端使用 touchstart 避免双击问题
        if (toggleBtn) {
            if (isTouchDevice) {
                toggleBtn.addEventListener('touchstart', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isCollapsing) return;
                    // 防止快速双击
                    var now = Date.now();
                    if (now - lastTouchTime < 500) return;
                    lastTouchTime = now;
                    if (constellationActive) {
                        deactivateConstellation();
                    } else {
                        handleExpand();
                    }
                }, { passive: false });
            } else {
                toggleBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    if (isCollapsing) return;
                    if (constellationActive) {
                        deactivateConstellation();
                    } else {
                        handleExpand();
                    }
                });
            }
        }

        // 初始化
        initConstellation();

        // 响应 resize
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resizeCanvas();
            }, 200);
        });

        // 滚动到可见时重新计算
        var constellationObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    resizeCanvas();
                }
            });
        }, { threshold: 0.1 });
        constellationObserver.observe(constellation);
    }

    /* ============================================================
       STATS COUNTERS — 数字滚动动画
       ============================================================ */
    var counterCards = document.querySelectorAll('.counter-number');
    if (counterCards.length > 0) {
        var countersAnimated = false;

        function animateCounter(el) {
            var target = parseInt(el.getAttribute('data-target'), 10) || 0;
            var suffix = el.getAttribute('data-suffix') || '';
            var current = 0;
            var duration = 1500; // ms
            var startTime = null;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                // easeOutCubic
                var eased = 1 - Math.pow(1 - progress, 3);
                current = Math.floor(eased * target);
                el.textContent = current + suffix;
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target + suffix;
                }
            }

            requestAnimationFrame(step);
        }

        var counterObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !countersAnimated) {
                    countersAnimated = true;
                    counterCards.forEach(function (el) {
                        animateCounter(el);
                    });
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        // observe 第一个 counter 的父容器
        var countersContainer = document.getElementById('statsCounters');
        if (countersContainer) {
            counterObserver.observe(countersContainer);
        }
    }

    /* ============================================================
       CONTACT — 邮箱一键复制
       ============================================================ */
    var emailCard = document.getElementById('contactEmailCard');
    if (emailCard) {
        emailCard.addEventListener('click', function (e) {
            e.preventDefault();
            var email = 'cheniug99@gmail.com';
            // 优先使用 Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(email).then(function () {
                    showCopyToast('邮箱');
                }).catch(function () {
                    fallbackCopy(email, '邮箱');
                });
            } else {
                fallbackCopy(email, '邮箱');
            }
        });
    }

    /* ============================================================
       CONTACT — 微信一键复制
       ============================================================ */
    var wechatCard = document.getElementById('contactWechatCard');
    if (wechatCard) {
        wechatCard.addEventListener('click', function (e) {
            e.preventDefault();
            var wechatId = 'valkjin';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(wechatId).then(function () {
                    showCopyToast('微信号');
                }).catch(function () {
                    fallbackCopy(wechatId, '微信号');
                });
            } else {
                fallbackCopy(wechatId, '微信号');
            }
        });
    }

    /* ============================================================
       CONTACT — QQ一键复制
       ============================================================ */
    var qqCard = document.getElementById('contactQQCard');
    if (qqCard) {
        qqCard.addEventListener('click', function (e) {
            e.preventDefault();
            var qqId = '1247903536';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(qqId).then(function () {
                    showCopyToast('QQ号');
                }).catch(function () {
                    fallbackCopy(qqId, 'QQ号');
                });
            } else {
                fallbackCopy(qqId, 'QQ号');
            }
        });
    }

    // 统一的 Toast 提示
    function showCopyToast(type) {
        var existing = document.querySelector('.contact-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.className = 'contact-toast';
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = '✓ ' + (type || '内容') + '已复制到剪贴板';
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('show');
        });

        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 2000);
    }

    // 统一的 fallbackCopy 函数
    function fallbackCopy(text, type) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
            document.execCommand('copy');
            showCopyToast(type);
        } catch (err) {
            // silent fail
        }
        document.body.removeChild(ta);
    }

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
       ABOUT CARD FOLD TOGGLE — 02/03/04 卡片折叠/展开
       ============================================================ */
    document.querySelectorAll('.card-fold-toggle').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var card = btn.closest('.about-card');
            var body = card.querySelector('.card-fold-body');
            var isExpanded = btn.getAttribute('aria-expanded') === 'true';

            if (isExpanded) {
                btn.setAttribute('aria-expanded', 'false');
                btn.setAttribute('aria-label', '展开卡片');
                body.classList.add('collapsed');
                body.setAttribute('aria-hidden', 'true');
            } else {
                btn.setAttribute('aria-expanded', 'true');
                btn.setAttribute('aria-label', '折叠卡片');
                body.classList.remove('collapsed');
                body.removeAttribute('aria-hidden');

                // 其他展开的卡片以不同速度错落折起
                var allCards = document.querySelectorAll('.about-card.glass-card:has(.card-fold-body)');
                allCards.forEach(function (otherCard) {
                    if (otherCard === card) return;
                    var otherBody = otherCard.querySelector('.card-fold-body');
                    var otherBtn = otherCard.querySelector('.card-fold-toggle');
                    if (otherBtn && otherBtn.getAttribute('aria-expanded') === 'true') {
                        var delay = (Array.from(allCards).indexOf(otherCard)) * 100;
                        setTimeout(function () {
                            otherBtn.setAttribute('aria-expanded', 'false');
                            otherBtn.setAttribute('aria-label', '展开卡片');
                            otherBody.classList.add('collapsed');
                            otherBody.setAttribute('aria-hidden', 'true');
                        }, delay);
                    }
                });
            }
        });
    });

    /* ============================================================
       GLASS CARD MOUSE GLOW — 卡片鼠标光晕跟随
       C2: 轮播卡片也支持微光跟随
       ============================================================ */
    document.querySelectorAll('.glass-card, .about-card-hero').forEach(function (card) {
        card.addEventListener('mousemove', function (e) {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });

    // 开发环境日志（生产环境可安全移除）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🚀 Chaniug 个人主页已就绪 — Moonshot Style');
    }
})();
