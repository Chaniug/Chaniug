/*
   签名手写动画 + 弹窗逻辑 + 签名滚动过渡
   从 index.html 内联脚本中提取
*/
(function () {
    'use strict';

    /* ============================================================
       安全 HTML 渲染 — 使用 DOMParser 替代直接 innerHTML
       ============================================================ */
    function safeRenderHTML(container, htmlString) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(htmlString, 'text/html');
        // 清除容器现有内容
        while (container.firstChild) container.removeChild(container.firstChild);
        // 逐个移植节点
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

                    // 创建渐变色 — 橙金 → 粉 → 青
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

                    // 初始化：设置渐变填充，并用 mask 实现绘制效果
                    for (var i = 0; i < paths.length; i++) {
                        var p = paths[i];
                        p.removeAttribute('style');
                        p.setAttribute('fill', 'url(#signature-gradient)');
                        p.removeAttribute('stroke');

                        // 创建 mask
                        var maskId = 'mask-' + i;
                        var mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
                        mask.id = maskId;

                        // mask 背景：黑色（隐藏）
                        var maskBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        maskBg.setAttribute('x', '-1000');
                        maskBg.setAttribute('y', '-1000');
                        maskBg.setAttribute('width', '3000');
                        maskBg.setAttribute('height', '3000');
                        maskBg.setAttribute('fill', 'black');
                        mask.appendChild(maskBg);

                        // mask 路径：白色粗线（显示），复制原 path 的 d 属性
                        var maskPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        maskPath.setAttribute('d', p.getAttribute('d'));
                        maskPath.setAttribute('fill', 'none');
                        maskPath.setAttribute('stroke', 'white');
                        maskPath.setAttribute('stroke-width', '30');
                        maskPath.setAttribute('stroke-linecap', 'round');
                        maskPath.setAttribute('stroke-linejoin', 'round');

                        // 设置 stroke-dasharray 动画
                        var len = p.getTotalLength();
                        maskPath.style.strokeDasharray = len;
                        maskPath.style.strokeDashoffset = len;

                        mask.appendChild(maskPath);
                        defs.appendChild(mask);

                        // 应用 mask 到原 path
                        p.setAttribute('mask', 'url(#' + maskId + ')');

                        p._maskPath = maskPath;
                        p._len = len;
                    }

                    // 逐个动画：通过 maskPath 的 stroke-dashoffset 实现绘制效果
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

                    // 完成后移除 mask，添加发光
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
    var techModalTitle = techModalOverlay.querySelector('.tech-modal-title');
    var techModalSubtitle = techModalOverlay.querySelector('.tech-modal-subtitle');
    var techModalIcon = techModalOverlay.querySelector('.tech-modal-icon');
    var techModalDetails = techModalOverlay.querySelector('.tech-modal-details');
    var techModalClose = techModalOverlay.querySelector('.tech-modal-close');

    function openModal(data) {
        techModalTitle.textContent = data.title;
        techModalSubtitle.textContent = data.subtitle;
        techModalIcon.textContent = data.icon;
        safeRenderHTML(techModalDetails, data.details);
        techModalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        techModalOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // 从 JSON 文件加载弹窗数据
    fetch('data/modals.json')
        .then(function (response) { return response.json(); })
        .then(function (data) {
            modalData = data;

            // 为技术栈列添加点击事件
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

            // 为探索芯片添加点击事件
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
        });

    // 关闭弹窗
    techModalClose.addEventListener('click', closeModal);

    techModalOverlay.addEventListener('click', function (e) {
        if (e.target === techModalOverlay) closeModal();
    });

    // ESC 键关闭弹窗
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && techModalOverlay.classList.contains('active')) {
            closeModal();
        }
    });

    /* ============================================================
       SIGNATURE SCROLL — 滚动过渡效果：签名向上淡出 + 抽屉回弹
       ============================================================ */
    var ticking = false;
    var lastProgress = 0;
    window.addEventListener('scroll', function () {
        if (!ticking) {
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
