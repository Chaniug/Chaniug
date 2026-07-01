/* ============================================================
   HERO SYNC — 三元素联动协调层
   连接头像 / 动态签名 / 代码编辑器，实现：
   1. 入场叙事链：签名绘制完成 → 触发代码框逐行入场
   2. 状态同步：代码框 error/fixed/result → 头像+签名微变色
   3. hover 呼吸：hover 头像或代码框 → 三者同步微亮
   不修改 personal.min.js，通过 CustomEvent + MutationObserver 驱动
   ============================================================ */
!function () {
    "use strict";

    var heroContent = document.querySelector(".hero-content");
    var avatarWrapper = document.querySelector(".avatar-wrapper");
    var signatureEl = document.querySelector(".hero-signature");
    var signatureInner = document.querySelector(".signature-inner");
    var bioEl = document.querySelector(".hero-bio");

    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ----------------------------------------------------------
       1. 入场叙事链
       锁定代码框（data-narrative-lock 隐藏 + narrativeWait 跳过自动入场）
       监听签名 .svg-glow 出现（绘制完成）→ 解锁代码框 + dispatch 事件
       ---------------------------------------------------------- */
    if (!reduced && bioEl) {
        bioEl.setAttribute("data-narrative-lock", "");
        document.body.setAttribute("data-narrative-wait", "");

        var unlocked = false;
        function unlockCode() {
            if (unlocked) return;
            unlocked = true;
            bioEl.removeAttribute("data-narrative-lock");
            void bioEl.offsetHeight; // 强制重排让 opacity transition 生效
            document.dispatchEvent(new CustomEvent("narrative-code-enter"));
        }

        // 监听签名子树 class 变化，捕获 .svg-glow 出现（绘制完成信号）
        if (signatureEl && "MutationObserver" in window) {
            var sigObs = new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    var m = muts[i];
                    if (m.attributeName === "class" && m.target.classList && m.target.classList.contains("svg-glow")) {
                        sigObs.disconnect();
                        setTimeout(unlockCode, 300);
                        return;
                    }
                }
            });
            sigObs.observe(signatureEl, { subtree: true, attributes: true, attributeFilter: ["class"] });
        }

        // Fallback：8s 未检测到签名完成 → 强制解锁
        setTimeout(unlockCode, 8000);
    }

    /* ----------------------------------------------------------
       2. 状态同步
       监听 editor-interact.js dispatch 的 editor-state-change 事件
       给 .hero-content 设置 data-sync-state 属性，CSS 驱动微变色
       error 态额外触发头像+签名微抖
       ---------------------------------------------------------- */
    if (heroContent) {
        document.addEventListener("editor-state-change", function (e) {
            var state = e.detail && e.detail.state;
            if (!state) return;
            heroContent.setAttribute("data-sync-state", state);

            // error 态：头像 + 签名微抖（重置动画以支持重复触发）
            if (state === "error") {
                if (avatarWrapper) triggerShake(avatarWrapper);
                if (signatureInner) triggerShake(signatureInner);
            }
        });
    }

    function triggerShake(el) {
        el.classList.remove("sync-shake");
        void el.offsetHeight; // 重置动画
        el.classList.add("sync-shake");
    }

    /* ----------------------------------------------------------
       3. hover 同步呼吸
       hover 头像或代码框时，给 .hero-content 设置 data-hero-hover
       CSS 驱动三者同步微亮（签名 pointer-events:none 不作为触发源）
       移动端（无 hover）不启用
       ---------------------------------------------------------- */
    if (heroContent && window.matchMedia && !window.matchMedia("(hover: none)").matches) {
        var hoverTargets = [avatarWrapper, bioEl].filter(Boolean);
        hoverTargets.forEach(function (el) {
            el.addEventListener("mouseenter", function () {
                heroContent.setAttribute("data-hero-hover", "");
            });
            el.addEventListener("mouseleave", function () {
                heroContent.removeAttribute("data-hero-hover");
            });
        });
    }
}();
