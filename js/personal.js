/*
   Chaniug 个人主页 JavaScript — Moonshot Style
   星空粒子 · 聚光灯 · 滚动动效 · 懒加载
*/

(function () {
    'use strict';

    /* ============================================================
       工具函数
       ============================================================ */
    // 防抖 — 保留参数和 this 上下文
    function debounce(fn, delay) {
        let timer;
        return function () {
            const args = arguments;
            const self = this;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(self, args);
            }, delay);
        };
    }

    // 检测是否为触屏设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // 检测是否为移动设备（小屏）— 支持 resize 动态更新
    let isMobile = window.innerWidth < 768;
    window.addEventListener('resize', debounce(function () {
        isMobile = window.innerWidth < 768;
    }, 250));

    // L3: 检测低端设备（CPU 核心 < 4 或内存 < 4GB），自动降级
    const isLowEndDevice = (function () {
        if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) return true;
        if (navigator.deviceMemory && navigator.deviceMemory < 4) return true;
        return false;
    })();

    // 移动端/低端设备：Canvas 使用 30fps 跳帧机制
    function useLowFps() { return isMobile || isLowEndDevice; }
    let lastStarFpsFrame = 0;
    let lastNebulaFpsFrame = 0;
    let lastDustFpsFrame = 0;
    const FPS_INTERVAL = 33; // 30fps = ~33.33ms

    // 移动端发热优化：大幅缩减粒子数，保留星空效果但降低 GPU 负载
    function getStarCount() {
        if (isLowEndDevice) return 15;
        if (isMobile) return 25;
        return 200;
    }
    function getNebulaCount() {
        if (isLowEndDevice) return 0;
        if (isMobile) return 0;
        return 25;
    }
    function getDustCount() {
        if (isLowEndDevice) return 10;
        if (isMobile) return 15;
        return 120;
    }

    // 移动端滚动时暂停非必要动画，减少 GPU 压力
    var scrollTicking = false;
    var scrollTimeout;
    if (isMobile) {
        window.addEventListener('scroll', function () {
            if (!scrollTicking) {
                requestAnimationFrame(function () {
                    document.body.classList.add('is-scrolling');
                    clearTimeout(scrollTimeout);
                    scrollTimeout = setTimeout(function () {
                        document.body.classList.remove('is-scrolling');
                    }, 300); // 滚动停止 300ms 后恢复动画，降低频繁切换开销
                    scrollTicking = false;
                });
                scrollTicking = true;
            }
        }, { passive: true });
    }

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
        // 用户显式暂停状态（点击暂停按钮后设为 true），优先于自动播放调度
        let isPaused = false;
        const totalSlides = slides.length;

        // 每张幻灯片独立停留时长（毫秒），营造节奏感
        // Slide 1（个人简介）：主要内容 → 7000ms
        // Slide 2（探索1+2）：简洁卡片，毛玻璃 4s 消退 → 6500ms
        // Slide 3（探索3+4）：延续，拼图揭示 → 6500ms
        const SLIDE_DURATIONS = [7000, 6500, 6500];

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
                    resetAutoPlay(2000);
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
                            }, 4000);
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
            // 用户显式暂停时，不再安排下一次自动切换
            if (!autoPlayStarted || isPaused) return;
            autoPlayTimer = setTimeout(function () {
                nextSlide();
                scheduleNext();
            }, getCurrentDuration());
        }

        function resetAutoPlay(extraDelay) {
            // 用户已暂停时不应通过滑动/点击箭头恢复自动播放
            if (isPaused) return;
            clearTimeout(autoPlayTimer);
            var delay = getCurrentDuration() + (extraDelay || 0);
            autoPlayTimer = setTimeout(function () {
                nextSlide();
                scheduleNext();
            }, delay);
        }

        function startAutoPlay() {
            if (!autoPlayStarted) {
                autoPlayStarted = true;
                if (!isPaused) {
                    scheduleNext();
                }
            }
        }


        // 触摸滑动支持 — 移动端优化：方向锁定 + 防抖 + 阻止默认回弹
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        slideshow.addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchStartTime = Date.now();
        }, { passive: true });

        slideshow.addEventListener('touchmove', function (e) {
            // 水平滑动时阻止默认行为，防止页面左右回弹
            var currentX = e.changedTouches[0].screenX;
            var currentY = e.changedTouches[0].screenY;
            var dx = Math.abs(currentX - touchStartX);
            var dy = Math.abs(currentY - touchStartY);
            // 提高触发阈值到 24px，并确保明显水平 dominant 时才拦截，
            // 避免轻微斜向滚动被误判为轮播滑动导致快速轮播感
            if (dx > dy * 1.3 && dx > 24) {
                e.preventDefault();
            }
        }, { passive: false });

        slideshow.addEventListener('touchend', function (e) {
            var touchEndX = e.changedTouches[0].screenX;
            var touchEndY = e.changedTouches[0].screenY;
            var diffX = touchStartX - touchEndX;
            var diffY = touchStartY - touchEndY;
            var elapsed = Date.now() - touchStartTime;

            // 过滤条件：最小滑动距离 80px、最小时间 80ms、水平 dominant
            if (Math.abs(diffX) < 80) return;
            if (elapsed < 80) return;
            if (Math.abs(diffY) > Math.abs(diffX) * 0.8) return; // 垂直滑动主导时忽略

            if (diffX > 0) {
                nextSlide();
            } else {
                prevSlide();
            }
            resetAutoPlay(2000);
        });

        // 鼠标进入暂停自动播放（临时覆盖，不修改用户显式暂停状态）
        slideshow.addEventListener('mouseenter', function () {
            clearTimeout(autoPlayTimer);
        });
        slideshow.addEventListener('mouseleave', function () {
            if (autoPlayStarted && !isPaused) {
                scheduleNext();
            }
        });

        // 轮播暂停/播放按钮
        var pauseBtn = slideshow.parentElement.querySelector('.carousel-pause-btn');
        function updatePauseButtonUI(paused) {
            if (!pauseBtn) return;
            var pIcon = pauseBtn.querySelector('.pause-icon');
            var pIcon2 = pauseBtn.querySelector('.play-icon');
            if (paused) {
                pauseBtn.setAttribute('aria-pressed', 'true');
                pauseBtn.setAttribute('aria-label', '播放轮播');
                if (pIcon) pIcon.style.display = 'none';
                if (pIcon2) pIcon2.style.display = '';
            } else {
                pauseBtn.setAttribute('aria-pressed', 'false');
                pauseBtn.setAttribute('aria-label', '暂停轮播');
                if (pIcon) pIcon.style.display = '';
                if (pIcon2) pIcon2.style.display = 'none';
            }
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (isPaused) {
                    slideshow._resumeAutoPlay();
                    updatePauseButtonUI(false);
                } else {
                    slideshow._pauseAutoPlay();
                    updatePauseButtonUI(true);
                }
            });
        }

        // 暴露控制方法供外部调用
        slideshow._startAutoPlay = startAutoPlay;
        slideshow._pauseAutoPlay = function () {
            isPaused = true;
            clearTimeout(autoPlayTimer);
        };
        slideshow._resumeAutoPlay = function () {
            isPaused = false;
            if (autoPlayStarted) {
                scheduleNext();
            }
        };
        // 冻结状态：离开视口时设置，防止重复 resume 导致 timer 堆积
        slideshow._frozen = false;
        // 解冻：从冻结状态恢复，重置 transition 后再 resume
        // 注意：若用户已显式暂停，解冻后仍保持暂停，不恢复自动播放
        slideshow._thaw = function () {
            if (!slideshow._frozen) return;
            slideshow._frozen = false;
            // 恢复 CSS 过渡，否则 goToSlide 会瞬间跳切
            if (track) track.style.transition = '';
            if (autoPlayStarted && !isPaused) {
                scheduleNext();
            }
        };
        // 彻底冻结：离开视口时立即停止 CSS 过渡 + 清理所有 setTimeout
        // 冻结不修改 isPaused，保留用户暂停状态
        slideshow._freeze = function () {
            slideshow._frozen = true;
            clearTimeout(autoPlayTimer);
            if (track) track.style.transition = 'none';
            if (autoColorTimer) { clearTimeout(autoColorTimer); autoColorTimer = null; }
            // 清理 Slide 3 可能正在进行的 mosaic tile timer（通过移除 tile）
            slides.forEach(function (s) {
                var imgWrap = s.querySelector('.gallery-image-wrapper');
                if (imgWrap) {
                    imgWrap.querySelectorAll('.mosaic-tile').forEach(function (t) { t.remove(); });
                    imgWrap.classList.remove('mosaic-done');
                }
                // 清理 detail 条目的 line-visible
                s.querySelectorAll('.hero-detail-item').forEach(function (d) {
                    d.classList.remove('detail-visible');
                });
            });
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
                        // 文字动画完成后（约 1s）再启动轮播
                        setTimeout(function () {
                            if (heroSlideshow && heroSlideshow._startAutoPlay) {
                                heroSlideshow._startAutoPlay();
                                carouselStarted = true;
                            }
                        }, 1000);
                    } else if (carouselStarted && heroSlideshow && heroSlideshow._thaw) {
                        // 重新入场：从冻结状态恢复（重置 transition + resume）
                        heroSlideshow._thaw();
                    }
                } else {
                    // 离开视口：彻底冻结轮播（暂停自动播放 + 停止 CSS 过渡 + 清理 timer）
                    if (carouselStarted && heroSlideshow && heroSlideshow._pauseAutoPlay) {
                        heroSlideshow._pauseAutoPlay();
                    }
                    if (heroSlideshow && heroSlideshow._freeze) {
                        heroSlideshow._freeze();
                    }
                }
            });
        }, {
            threshold: 0.05,
            rootMargin: '50px 0px',
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

    // 鼠标引力场 + 微星迸发 — 仅桌面端
    let mouseFieldX = -9999;
    let mouseFieldY = -9999;
    let lastMouseX = -9999;
    let lastMouseY = -9999;
    let mouseFieldTime = 0;
    let sparkParticles = []; // 临时微星
    const MOUSE_FIELD_RADIUS = 180;
    const MOUSE_FIELD_STRENGTH = 0.035;
    const SPARK_LIFETIME = 0.6;

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

            // 自然星空风格（移动端缩小最大半径，减少绘制面积）
            const baseAlpha = 0.10 + mag * 0.70;
            const radius = isMobile
                ? Math.min(0.12 + mag * 1.5, 1.5)
                : 0.12 + mag * 1.5;

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
                // 优化：拖尾历史 + 十字星芒（移动端禁用）
                trailHistory: isMobile ? null : [],
                trailMaxLen: isMobile ? 0 : 8,
                currentTrail: 0
            });
        }
    }

    function drawStars() {
        if (!pageVisible) {
            return;
        }

        // L3: 移动端/低端设备跳帧降至 30fps
        if (useLowFps()) {
            var now = performance.now();
            if (now - lastStarFpsFrame < FPS_INTERVAL) {
                starAnimId = requestAnimationFrame(drawStars);
                return;
            }
            lastStarFpsFrame = now;
        }

        ctx.clearRect(0, 0, width, height);
        globalTime += 0.016;

        // === 鼠标引力场：影响附近星星 + 绘制微星 ===
        if (!isMobile) {
            mouseFieldTime += 0.016;

            // 1. 引力场影响附近星星
            for (const star of stars) {
                var dx = mouseFieldX - star.x;
                var dy = mouseFieldY - star.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_FIELD_RADIUS && dist > 5) {
                    var force = (1 - dist / MOUSE_FIELD_RADIUS) * MOUSE_FIELD_STRENGTH;
                    star.x += dx * force;
                    star.y += dy * force;
                    // 越近越亮
                    star._mouseBoost = (1 - dist / MOUSE_FIELD_RADIUS) * 0.45;
                } else {
                    star._mouseBoost = 0;
                }
            }

            // 2. 绘制临时微星
            if (sparkParticles.length > 0) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                for (var si = sparkParticles.length - 1; si >= 0; si--) {
                    var sp = sparkParticles[si];
                    sp.life -= 0.016;
                    if (sp.life <= 0) {
                        sparkParticles.splice(si, 1);
                        continue;
                    }
                    var spAlpha = (sp.life / SPARK_LIFETIME);
                    // 微星抖动
                    sp.x += (Math.random() - 0.5) * 0.6;
                    sp.y += (Math.random() - 0.5) * 0.6;
                    var spSize = sp.baseSize * spAlpha;
                    var spGlow = spAlpha * 0.6;

                    ctx.beginPath();
                    ctx.arc(sp.x, sp.y, spSize, 0, Math.PI * 2);
                    ctx.fillStyle = 'hsla(' + sp.hue + ', ' + sp.sat + '%, ' + (70 + spAlpha * 25) + '%, ' + spGlow.toFixed(3) + ')';
                    ctx.fill();

                    // 微小光晕
                    if (spAlpha > 0.3) {
                        ctx.beginPath();
                        ctx.arc(sp.x, sp.y, spSize * 3, 0, Math.PI * 2);
                        ctx.fillStyle = 'hsla(' + sp.hue + ', ' + (sp.sat * 0.5) + '%, 75%, ' + (spGlow * 0.12).toFixed(3) + ')';
                        ctx.fill();
                    }
                }
                ctx.restore();
            }
        }

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

            // 移动端发热优化：跳过拖尾余晖计算
            if (!isMobile) {
                star.trailHistory.push(sparkleBoost);
                if (star.trailHistory.length > star.trailMaxLen) star.trailHistory.shift();
                let trailSum = 0, trailWeight = 0;
                for (let i = 0; i < star.trailHistory.length; i++) {
                    const w = (i + 1) / star.trailHistory.length;
                    trailSum += star.trailHistory[i] * w;
                    trailWeight += w;
                }
                const trailBoost = trailWeight > 0 ? trailSum / trailWeight : 0;
                star.currentTrail += (trailBoost - star.currentTrail) * 0.15;
            }

            const alpha = star.baseAlpha + shimmer * star.twinkleAmp + sparkleBoost * star.twinkleAmp + (star._mouseBoost || 0);
            const clampedAlpha = Math.max(0.01, Math.min(1, alpha));
            // 移动端发热优化：拖尾不参与最终 alpha
            const trailAlpha = isMobile ? clampedAlpha : Math.max(0, clampedAlpha + star.currentTrail * star.twinkleAmp * 0.5);

            // === 优化2: 色温动态变化 — 闪烁时偏蓝白，暗时偏暖 ===
            const colorShift = shimmer * 0.5 + sparkleBoost * 0.8; // -0.5 ~ +0.8
            const shiftedHue = star.hue - colorShift * 15; // 亮时色相向蓝端偏移
            const shiftedSat = Math.max(2, star.sat * (1 - Math.abs(colorShift) * 0.4));

            // 移动端发热优化：跳过拖尾辉光绘制
            if (!isMobile && star.isBright && star.currentTrail > 0.02) {
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

                // 移动端发热优化：仅对最亮星星绘制小光晕
                if (!isMobile || star.radius > 0.8) {
                    const glowAlpha = trailAlpha * 0.08;
                    if (glowAlpha > 0.002) {
                        ctx.beginPath();
                        ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
                        ctx.fillStyle = `hsla(${shiftedHue}, ${Math.max(3, effSat * 0.6)}%, 65%, ${glowAlpha})`;
                        ctx.fill();
                    }
                }

                // 移动端发热优化：完全跳过十字星芒绘制
                if (!isMobile) {
                    const crossIntensity = sparkleBoost + star.currentTrail * 0.6;
                    if (crossIntensity > 0.12) {
                        const crossAlpha = Math.min(1, crossIntensity * 1.2) * trailAlpha * 0.55;
                        const crossLen = star.radius * (6 + crossIntensity * 10);
                        const crossWidth = star.radius * (0.3 + crossIntensity * 0.7);
                        const flareColor = `hsla(${shiftedHue}, 20%, 88%, 1)`;

                        ctx.save();
                        ctx.globalAlpha = crossAlpha;
                        ctx.fillStyle = flareColor;
                        ctx.fillRect(star.x - crossLen, star.y - crossWidth, crossLen * 2, crossWidth * 2);
                        ctx.fillRect(star.x - crossWidth, star.y - crossLen, crossWidth * 2, crossLen * 2);

                        const diagLen = crossLen * 0.45;
                        const diagWidth = crossWidth * 0.5;
                        ctx.save();
                        ctx.translate(star.x, star.y);
                        ctx.rotate(Math.PI / 4);
                        ctx.globalAlpha = crossAlpha * 0.7;
                        ctx.fillRect(-diagLen, -diagWidth, diagLen * 2, diagWidth * 2);
                        ctx.restore();

                        ctx.restore();
                    }
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
        // L3: 逐级缩减粒子（低端 25 / 移动 50 / 桌面 200）
        createStars(getStarCount());
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

        // L3: 移动端跳帧降至 30fps
        if (useLowFps()) {
            var now = performance.now();
            if (now - lastNebulaFpsFrame < FPS_INTERVAL) {
                nebulaAnimId = requestAnimationFrame(drawNebula);
                return;
            }
            lastNebulaFpsFrame = now;
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
        // 移动端/低端设备跳过星云初始化以节省 GPU
        var count = getNebulaCount();
        if (count === 0) {
            nebulaCtx.clearRect(0, 0, nbw, nbh);
            return;
        }
        createNebula(count);
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

        // L3: 移动端跳帧降至 30fps
        if (useLowFps()) {
            var now = performance.now();
            if (now - lastDustFpsFrame < FPS_INTERVAL) {
                dustAnimId = requestAnimationFrame(drawDust);
                return;
            }
            lastDustFpsFrame = now;
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
        // L3: 逐级缩减（低端 10 / 移动 15 / 桌面 120）
        createDust(getDustCount());
        if (dustAnimId) cancelAnimationFrame(dustAnimId);
        dustAnimId = requestAnimationFrame(drawDust);
    }

    window.addEventListener('resize', debounce(initDust, 250));
    initDust();

    // 移动端/低端设备关闭混合模式，降低 GPU 合成开销
    if (isMobile || isLowEndDevice) {
        [canvas, nebulaCanvas, dustCanvas].forEach(function (c) {
            if (c) c.style.mixBlendMode = 'normal';
        });
    }

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
                // 引力场位置 + 快速移动迸发微星
                if (!isMobile) {
                    var prevX = lastMouseX;
                    var prevY = lastMouseY;
                    lastMouseX = e.clientX;
                    lastMouseY = e.clientY;
                    mouseFieldX = e.clientX;
                    mouseFieldY = e.clientY;

                    // 快速移动时迸发微星
                    if (prevX > -1000) {
                        var moveDist = Math.sqrt(Math.pow(e.clientX - prevX, 2) + Math.pow(e.clientY - prevY, 2));
                        if (moveDist > 6 && sparkParticles.length < 20) {
                            var sparkCount = Math.min(3, Math.floor(moveDist / 12));
                            for (var si = 0; si < sparkCount; si++) {
                                sparkParticles.push({
                                    x: prevX + (e.clientX - prevX) * (Math.random() * 0.7 + 0.15),
                                    y: prevY + (e.clientY - prevY) * (Math.random() * 0.7 + 0.15),
                                    baseSize: 0.5 + Math.random() * 1.2,
                                    hue: Math.random() < 0.6 ? 190 + Math.random() * 50 : 35 + Math.random() * 25,
                                    sat: 10 + Math.random() * 25,
                                    life: SPARK_LIFETIME * (0.6 + Math.random() * 0.4)
                                });
                            }
                        }
                    }
                }
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
    // 脚本在 </body> 前加载，DOM 已就绪，直接执行无需等待事件
    document.querySelectorAll('#hero .reveal').forEach(function (el) {
        el.classList.add('visible');
    });

    /* ============================================================
       LAZY LOAD IMAGES — 图片懒加载（支持 picture + WebP）
       ============================================================ */
    // 注意: <source> 元素没有视觉布局，不能用 IntersectionObserver 监控
    // 改为在 <img> 加载时同步激活同 <picture> 内的 <source>
    const lazyImages = document.querySelectorAll('img[data-src]');

    const imgObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.getAttribute('data-src')) {
                    img.src = img.getAttribute('data-src');
                    img.removeAttribute('data-src');

                    // 同步激活同一 <picture> 内的 <source> 的 srcset
                    var picture = img.closest('picture');
                    if (picture) {
                        var sources = picture.querySelectorAll('source[data-srcset]');
                        sources.forEach(function (source) {
                            source.srcset = source.getAttribute('data-srcset');
                            source.removeAttribute('data-srcset');
                        });
                    }
                }
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
            // L3: 移动端/低端设备减少跨类别连线，降低 Canvas 绘制压力
            (isMobile
                ? [[0, 5], [2, 5], [6, 8], [7, 8], [13, 6]]  // 移动端仅保留 5 条关键跨类连线
                : [
                    [0, 5], [2, 5], [3, 6], [5, 6],
                    [6, 8], [7, 8], [1, 9], [9, 10],
                    [11, 5], [12, 7], [13, 6],
                ]).forEach(function (pair) {
                var a = pair[0], b = pair[1];
                if (a < nodeData.length && b < nodeData.length) {
                    edges.push({ a: a, b: b, sameCategory: false });
                }
            });
            return edges;
        }

        // 粒子系统（沿连线流动的光点）
        var particles = [];
        // 移动端进一步减少粒子数量，降低 GPU 压力
        function getMaxParticles() { return isMobile ? 3 : 18; }

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
            while (particles.length < getMaxParticles()) {
                var p = spawnParticle();
                if (p) particles.push(p);
            }
        }

        // 边界余量：确保节点标签不被边缘裁剪
        var driftMarginX = 70;
        var driftMarginY = 50;

        // 共享辅助：用 transform 设置节点位置，避免 left/top 触发 layout
        function setNodePos(nd, x, y) {
            nd.el.style.left = x + 'px';
            nd.el.style.top = y + 'px';
            // 取消漂移偏移，保持 CSS 默认居中 transform
            nd.el.style.transform = 'translate(-50%, -50%)';
        }

        function setNodeDrift(nd, offsetX, offsetY) {
            // 在 CSS 居中 transform 基础上叠加漂移偏移，GPU 合成不触发 layout
            nd.el.style.transform = 'translate(-50%, -50%) translate(' + offsetX + 'px, ' + offsetY + 'px)';
        }

        // 更新节点实时位置（漂浮漂移）—— 移动端低帧率模式：每 2 帧更新一次
        var driftFrameSkip = 0;
        function updateDrift() {
            // 移动端隔帧更新，降低渲染压力
            if (isMobile) {
                driftFrameSkip++;
                if (driftFrameSkip < 2) return;
                driftFrameSkip = 0;
            }
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
                // 使用 transform 偏移避免 layout 重排
                var offsetX = nx - nd.baseX;
                var offsetY = ny - nd.baseY;
                setNodeDrift(nd, offsetX, offsetY);
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
            while (particles.length < getMaxParticles()) {
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
                    setNodePos(nd, nd.baseX, nd.baseY);
                } else {
                    setNodePos(nd, nd.baseX, nd.baseY);
                }
                nd.curX = nd.baseX;
                nd.curY = nd.baseY;
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

            setNodePos(nd, nd.curX, nd.curY);
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
                nd.baseX = cx;
                nd.baseY = cy;
                nd.curX = cx;
                nd.curY = cy;
                setNodePos(nd, cx, cy);
            });
        }

        // 点击核心 → 大爆炸展开
        var expandTimer = null;
        function activateConstellation() {
            // 重新计算节点坐标，修复收拢后再次展开位置错误的问题
            computeBasePositions();
            var staggerTime = 60;
            nodeData.forEach(function (nd, i) {
                setTimeout(function () {
                    nd.returning = false;
                    nd.curX = nd.baseX;
                    nd.curY = nd.baseY;
                    nd.el.style.left = nd.baseX + 'px';
                    nd.el.style.top = nd.baseY + 'px';
                    nd.el.style.transform = 'translate(-50%, -50%)';
                }, i * staggerTime + 40);
            });
            var totalDelay = nodeData.length * staggerTime + 180;
            expandTimer = setTimeout(function () {
                tick = 0;
                if (!frameId) animate();
            }, totalDelay);
        }

        // 收拢星子 → 坍塌回中心
        function deactivateConstellation(callback) {
            isCollapsing = true;
            constellation.classList.add('collapsing');
            if (toggleBtn) toggleBtn.classList.add('collapsing-state');
            
            // 安全复位：确保无论是否出错，state 都能恢复（防止 canvas/null 等问题导致状态卡死）
            function resetState() {
                constellation.classList.remove('active', 'collapsing');
                constellationActive = false;
                isCollapsing = false;
                if (toggleBtn) toggleBtn.classList.remove('collapsing-state');
                updateToggleText();
                if (canvas) canvas.classList.remove('fading-out');
            }
            
            try {
                // 清除未完成的展开定时器，防止动画循环泄漏
                if (expandTimer) {
                    clearTimeout(expandTimer);
                    expandTimer = null;
                }
                // 停止动画循环
                if (frameId) {
                    cancelAnimationFrame(frameId);
                    frameId = null;
                }
                
                // 清空粒子 - 延迟清除画布，等待淡出动画完成
                particles = [];
                
                // Canvas 淡出 - 使用 CSS class 而非直接操作 style，避免冲突
                if (canvas) canvas.classList.add('fading-out');
                
                // 延迟清空画布，等待淡出动画完成后再清除
                setTimeout(function() {
                    if (ctx && canvas && canvas.classList.contains('fading-out')) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                }, 600); // 等待 0.5s 淡出 + 0.1s 缓冲
                
                // 计算中心点
                var cx = constellation.offsetWidth / 2;
                var cy = constellation.offsetHeight / 2;
                
                // 使用 left/top + transform 定位，CSS 已优化过渡不包含这些属性
                var staggerTime = 50;
                nodeData.forEach(function (nd, i) {
                    var delay = (nodeData.length - 1 - i) * staggerTime;
                    setTimeout(function () {
                        nd.curX = cx;
                        nd.curY = cy;
                        nd.el.style.left = cx + 'px';
                        nd.el.style.top = cy + 'px';
                        nd.el.style.transform = 'translate(-50%, -50%)';
                        nd.returning = false;
                    }, delay);
                });
                
                var totalDuration = nodeData.length * staggerTime + 250;
                setTimeout(function () {
                    resetState();
                    // 回到初始聚拢状态
                    initConstellation();
                    if (callback) callback();
                }, totalDuration);
            } catch (e) {
                // 防止任何异常导致 state 永久卡死
                console.warn('[Constellation] deactivate error:', e);
                if (expandTimer) { clearTimeout(expandTimer); expandTimer = null; }
                resetState();
                initConstellation();
                if (callback) callback();
            }
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
            if (isCollapsing) return;
            if (constellationActive) {
                // 安全恢复：核心被点击时若 active 仍为 true（状态卡死），先复位
                constellation.classList.remove('active');
                constellationActive = false;
                if (toggleBtn) toggleBtn.classList.remove('active-state');
            }
            constellationActive = true;
            constellation.classList.add('active');
            updateToggleText();
            activateConstellation();
        }
        
        if (coreEl) {
            // 移动端只使用 touchstart，避免 click 和 touchstart 同时触发
            if (isTouchDevice) {
                coreEl.addEventListener('touchstart', function (e) {
                    if (isCollapsing) return;
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

        // 标记初始化完成，移除闪烁
        requestAnimationFrame(function() {
            if (constellation) {
                constellation.classList.add('initialized');
            }
        });

        // 响应 resize
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resizeCanvas();
            }, 200);
        });

        // 滚动到可见时重新计算 + 暂停/恢复动画
        var constellationObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // 进入视口：重新计算Canvas大小
                    resizeCanvas();
                    // 移动端发热优化：不自动恢复星座动画，除非用户已手动展开
                    if (!isMobile && constellationActive && !frameId) {
                        tick = 0;
                        animate();
                    }
                } else {
                    // 离开视口：暂停动画以节省性能
                    if (frameId) {
                        cancelAnimationFrame(frameId);
                        frameId = null;
                    }
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
       CONTACT — 一键复制（通用）
       ============================================================ */
    function copyToClipboard(text, label) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                showCopyToast(label);
            }).catch(function () {
                fallbackCopy(text, label);
            });
        } else {
            fallbackCopy(text, label);
        }
    }

    var copyTargets = [
        { id: 'contactEmailCard', text: 'cheniug99@gmail.com', label: '邮箱' },
        { id: 'contactWechatCard', text: 'valkjin', label: '微信号' },
        { id: 'contactQQCard', text: '1247903536', label: 'QQ号' }
    ];

    copyTargets.forEach(function (item) {
        var card = document.getElementById(item.id);
        if (card) {
            card.addEventListener('click', function (e) {
                e.preventDefault();
                copyToClipboard(item.text, item.label);
            });
        }
    });

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

        // 导航条背景变化 - 移动端简化
        if (window.innerWidth <= 768) {
            // 移动端始终使用scrolled样式，避免动态切换导致的闪烁
            siteNav.classList.add('scrolled');
        } else {
            if (scrollY > 60) {
                siteNav.classList.add('scrolled');
            } else {
                siteNav.classList.remove('scrolled');
            }
        }

        // 确定当前激活的 section - 使用IntersectionObserver替代getBoundingClientRect
        let activeLink = null;
        let maxVisible = -Infinity;
        navSections.forEach(function (item) {
            const rect = item.section.getBoundingClientRect();
            // 找到最可见的section
            if (rect.top <= navHeight + 100 && rect.bottom > navHeight) {
                if (rect.top > maxVisible) {
                    maxVisible = rect.top;
                    activeLink = item.link;
                }
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
            // 更新指示器位置 - 仅在桌面端
            if (window.innerWidth > 768 && navIndicator) {
                const linkRect = activeLink.getBoundingClientRect();
                const navRect = siteNav.getBoundingClientRect();
                navIndicator.classList.add('visible');
                navIndicator.style.left = (linkRect.left - navRect.left) + 'px';
                navIndicator.style.width = linkRect.width + 'px';
            }
        }
    }

    // 使用IntersectionObserver优化滚动监听（桌面端）
    if ('IntersectionObserver' in window && window.innerWidth > 768) {
        // 桌面端使用IntersectionObserver
        const observer = new IntersectionObserver(function(entries) {
            requestAnimationFrame(function() {
                updateNavActive();
            });
        }, {
            threshold: [0, 0.25, 0.5, 0.75, 1]
        });
        
        navSections.forEach(function(item) {
            if (item.section) {
                observer.observe(item.section);
            }
        });
    } else {
        // 移动端使用节流的scroll事件
        let navScrollTicking = false;
        window.addEventListener('scroll', function () {
            if (!navScrollTicking) {
                requestAnimationFrame(function () {
                    updateNavActive();
                    navScrollTicking = false;
                });
                navScrollTicking = true;
            }
        }, { passive: true }); // 添加passive提升性能
    }

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
                // 移动端：transition 完成后彻底隐藏，停止内部 SVG 动画渲染
                if (isMobile) {
                    setTimeout(function () {
                        body.style.display = 'none';
                    }, 600);
                }
            } else {
                btn.setAttribute('aria-expanded', 'true');
                btn.setAttribute('aria-label', '折叠卡片');
                // 移动端：先恢复 display，再移除 collapsed 触发 transition
                if (isMobile) body.style.display = '';
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
                            if (isMobile) {
                                setTimeout(function () {
                                    otherBody.style.display = 'none';
                                }, 600);
                            }
                        }, delay);
                    }
                });
            }
        });
    });

    /* ============================================================
       GLASS CARD MOUSE GLOW — 卡片鼠标光晕跟随
       C2: 轮播卡片也支持微光跟随
       移动端禁用：避免 touchmove 时频繁更新 CSS 变量导致掉帧
       ============================================================ */
    if (!isMobile) {
        document.querySelectorAll('.glass-card, .about-card-hero').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                card.style.setProperty('--mouse-x', x + '%');
                card.style.setProperty('--mouse-y', y + '%');
            });
        });
    }

    // 开发环境日志（生产环境可安全移除）
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🚀 Chaniug 个人主页已就绪 — Moonshot Style');
    }
})();

/* ============================================================
   SIGNATURE MODAL MODULE (原 signature-modal.js 已合并)
   签名手写动画 + 弹窗逻辑 + 签名滚动过渡
   ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       安全 HTML 渲染 — 使用 DOMParser 替代直接 innerHTML
       ============================================================ */
    function safeRenderHTML(container, htmlString) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlString, 'text/html');
        while (container.firstChild) container.removeChild(container.firstChild);
        var nodes = doc.body.childNodes;
        while (nodes.length > 0) {
            container.appendChild(nodes[0]);
        }
    }

    /* ============================================================
       SIGNATURE — 手写动画：实心填充 + mask 绘制动画
       ============================================================ */
    var el = document.getElementById('heroSignature');
    if (!el) return;

    var done = false;
    function go() {
        if (done) return;
        done = true;

        var inner = el.querySelector('.signature-inner');
        fetch('img/valkjin.svg')
            .then(function (r) { return r.text(); })
            .then(function (txt) {
                var d = document.createElement('div');
                d.innerHTML = txt;
                var svg = d.querySelector('svg');
                if (!svg) return;
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                svg.style.width = '100%';
                svg.style.height = 'auto';
                if (inner) inner.appendChild(svg);
                else el.appendChild(svg);

                requestAnimationFrame(function () {
                    var paths = svg.querySelectorAll('path');
                    var delay = 0;
                    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                    svg.insertBefore(defs, svg.firstChild);

                    var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
                    gradient.id = 'signature-gradient';
                    gradient.setAttribute('x1', '0%');
                    gradient.setAttribute('y1', '0%');
                    gradient.setAttribute('x2', '100%');
                    gradient.setAttribute('y2', '0%');

                    var stops = [
                        { offset: '0%', color: '#f59e0b' },
                        { offset: '35%', color: '#f472b6' },
                        { offset: '70%', color: '#22d3ee' },
                        { offset: '100%', color: '#0ea5e9' }
                    ];
                    stops.forEach(function (s) {
                        var stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
                        stop.setAttribute('offset', s.offset);
                        stop.setAttribute('stop-color', s.color);
                        gradient.appendChild(stop);
                    });
                    defs.appendChild(gradient);

                    for (var i = 0; i < paths.length; i++) {
                        var p = paths[i];
                        p.removeAttribute('style');
                        p.setAttribute('fill', 'url(#signature-gradient)');
                        p.removeAttribute('stroke');

                        var maskId = 'mask-' + i;
                        var mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
                        mask.id = maskId;

                        var maskBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        maskBg.setAttribute('x', '-1000');
                        maskBg.setAttribute('y', '-1000');
                        maskBg.setAttribute('width', '3000');
                        maskBg.setAttribute('height', '3000');
                        maskBg.setAttribute('fill', 'black');
                        mask.appendChild(maskBg);

                        var maskPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        maskPath.setAttribute('d', p.getAttribute('d'));
                        maskPath.setAttribute('fill', 'none');
                        maskPath.setAttribute('stroke', 'white');
                        maskPath.setAttribute('stroke-width', '30');
                        maskPath.setAttribute('stroke-linecap', 'round');
                        maskPath.setAttribute('stroke-linejoin', 'round');

                        var len = p.getTotalLength();
                        maskPath.style.strokeDasharray = len;
                        maskPath.style.strokeDashoffset = len;

                        mask.appendChild(maskPath);
                        defs.appendChild(mask);

                        p.setAttribute('mask', 'url(#' + maskId + ')');

                        p._maskPath = maskPath;
                        p._len = len;
                    }

                    for (var i = 0; i < paths.length; i++) {
                        var p = paths[i];
                        var len = p._len;
                        var dur = Math.max(0.4, Math.min(len / 150, 1.2));
                        (function (p, dur, d) {
                            setTimeout(function () {
                                var maskPath = p._maskPath;
                                maskPath.style.transition = 'stroke-dashoffset ' + dur + 's ease-in-out';
                                maskPath.style.strokeDashoffset = '0';
                            }, d);
                        })(p, dur, delay);
                        delay += dur * 1000 * 0.55;
                    }

                    setTimeout(function () {
                        for (var i = 0; i < paths.length; i++) {
                            paths[i].removeAttribute('mask');
                        }
                        svg.classList.add('svg-glow');
                    }, delay + 800);
                });
            });
    }

    if ('IntersectionObserver' in window) {
        var ob = new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) { go(); ob.disconnect(); }
        }, { threshold: 0.2 });
        ob.observe(el);
    } else {
        setTimeout(go, 500);
    }

    /* ============================================================
       MODAL — 弹窗数据管理
       ============================================================ */
    var modalData = {};
    var techModalOverlay = document.getElementById('techModalOverlay');
    if (techModalOverlay) {
        var techModalTitle = techModalOverlay.querySelector('.tech-modal-title');
        var techModalSubtitle = techModalOverlay.querySelector('.tech-modal-subtitle');
        var techModalIcon = techModalOverlay.querySelector('.tech-modal-icon');
        var techModalDetails = techModalOverlay.querySelector('.tech-modal-details');
        var techModalClose = techModalOverlay.querySelector('.tech-modal-close');

        function openModal(data) {
            techModalTitle.textContent = data.title;
            techModalSubtitle.textContent = data.subtitle;
            safeRenderHTML(techModalIcon, data.icon);
            safeRenderHTML(techModalDetails, data.details);
            techModalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            techModalOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        fetch('data/modals.json')
            .then(function (response) { return response.json(); })
            .then(function (data) {
                modalData = data;

                var techCols = document.querySelectorAll('.tech-col');
                techCols.forEach(function (col) {
                    col.style.cursor = 'pointer';
                    col.addEventListener('click', function () {
                        var colClass = col.classList[1];
                        var key = colClass.split('-')[2];
                        var dataKey = key === 'fe' ? 'frontend' : (key === 'be' ? 'backend' : 'infra');
                        var item = modalData.techStack[dataKey];
                        if (item) openModal(item);
                    });
                });

                var exploreChips = document.querySelectorAll('.explore-chip[data-explore]');
                exploreChips.forEach(function (chip) {
                    chip.addEventListener('click', function () {
                        var key = this.getAttribute('data-explore');
                        var item = modalData.explore[key];
                        if (item) openModal(item);
                    });
                });
            })
            .catch(function (error) {
                console.error('加载弹窗数据失败:', error);
                // 错误时显示用户可见的提示
                if (techModalDetails) {
                    safeRenderHTML(techModalDetails, '<p class="tech-modal-error">⚠️ 数据加载失败，请刷新重试</p>');
                }
            });

        techModalClose.addEventListener('click', closeModal);

        techModalOverlay.addEventListener('click', function (e) {
            if (e.target === techModalOverlay) closeModal();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && techModalOverlay.classList.contains('active')) {
                closeModal();
            }
        });
    }

    /* ============================================================
       SIGNATURE SCROLL — 滚动过渡效果
       ============================================================ */
    var ticking = false;
    var lastProgress = 0;
    var lastScrollTime = 0;
    // 移动端发热优化：签名滚动过渡进一步节流到 200ms，显著降低滚动时主线程压力
    var isMobileSig = window.innerWidth < 768;
    var SCROLL_THROTTLE = isMobileSig ? 200 : 16;
    window.addEventListener('scroll', function () {
        var now = Date.now();
        if (!ticking && now - lastScrollTime >= SCROLL_THROTTLE) {
            lastScrollTime = now;
            requestAnimationFrame(function () {
                var rect = el.getBoundingClientRect();
                var wh = window.innerHeight;
                var isScrollingDown = true;

                if (rect.bottom < wh) {
                    var progress = 1 - (rect.bottom / wh);
                    progress = Math.max(0, Math.min(1, progress));

                    isScrollingDown = progress > lastProgress;
                    lastProgress = progress;

                    var translateY = -progress * 30;
                    var scale = 1 - progress * 0.3;
                    var opacity = 1 - progress * 0.8;

                    el.style.transform = 'translateY(' + translateY + 'px) scale(' + scale + ')';
                    el.style.opacity = opacity;

                    if (isScrollingDown) {
                        el.style.transition = 'none';
                    } else {
                        el.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease';
                    }
                } else {
                    el.style.transform = 'translateY(0px) scale(1)';
                    el.style.opacity = '1';
                    el.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease';
                    lastProgress = 0;
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();
