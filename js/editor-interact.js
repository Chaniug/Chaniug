/* ============================================================
   EDITOR INTERACT — 代码编辑器 3 态交互状态机
   点击 .editor-body 循环切换：error → fixed → result → error
   不使用 Enter 键（保留给 #terminalInput 彩蛋）
   ============================================================ */
!function () {
    "use strict";

    var body = document.getElementById("editorBody");
    var content = document.getElementById("codeContent");
    var statusEl = document.getElementById("editorStatus");
    var statusText = statusEl ? statusEl.querySelector(".status-text") : null;
    var hint = document.getElementById("editorHint");
    if (!body || !content) return;

    // 3 态代码内容（HTML 片段数组，每项为一行 .code-line）
    var STATES = {
        error: {
            statusText: "\u2716 error",
            statusCls: "is-error",
            showHint: true,
            lines: [
                '<div class="code-line"><span class="tok-comment">// valkjin \u2014 creative developer</span></div>',
                '<div class="code-line"><span class="tok-kw">const</span> <span class="tok-var">developer</span> <span class="tok-punct">=</span> <span class="tok-punct">{</span></div>',
                '<div class="code-line indent"><span class="tok-var">role</span><span class="tok-punct">:</span> <span class="tok-str">"\u524d\u7AEF\u67B6\u6784 \u00D7 AI"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent error-line"><span class="tok-var">stack</span><span class="tok-punct">:</span> <span class="tok-punct">[</span><span class="tok-str">"LLM"</span><span class="tok-punct">,</span> <span class="tok-str">"\u81EA\u52A8\u5316"</span><span class="tok-punct">,</span> <span class="tok-str">"\u521B\u610F\u5DE5\u5177"</span><span class="tok-punct">]</span><span class="typing-cursor">|</span></div>',
                '<div class="code-line indent"><span class="tok-var">motto</span><span class="tok-punct">:</span> <span class="tok-str">"\u7528\u4EE3\u7801\u70B9\u4EAE\u6570\u5B57\u4E16\u754C"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent"><span class="tok-var">status</span><span class="tok-punct">:</span> <span class="tok-str">"co-creating the future"</span></div>',
                '<div class="code-line"><span class="tok-punct">}</span></div>',
                '<div class="code-line"><span class="tok-comment">// </span><span class="tok-err">\u2716 SyntaxError: expected \',\'</span></div>'
            ]
        },
        fixed: {
            statusText: "\u2714 fixed",
            statusCls: "is-fixed",
            showHint: false,
            lines: [
                '<div class="code-line"><span class="tok-comment">// valkjin \u2014 creative developer</span></div>',
                '<div class="code-line"><span class="tok-kw">const</span> <span class="tok-var">developer</span> <span class="tok-punct">=</span> <span class="tok-punct">{</span></div>',
                '<div class="code-line indent"><span class="tok-var">role</span><span class="tok-punct">:</span> <span class="tok-str">"\u524D\u7AEF\u67B6\u6784 \u00D7 AI"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent fixed-line"><span class="tok-var">stack</span><span class="tok-punct">:</span> <span class="tok-punct">[</span><span class="tok-str">"LLM"</span><span class="tok-punct">,</span> <span class="tok-str">"\u81EA\u52A8\u5316"</span><span class="tok-punct">,</span> <span class="tok-str">"\u521B\u610F\u5DE5\u5177"</span><span class="tok-punct">]</span><span class="tok-punct">,</span> <span class="tok-ok">\u2714</span></div>',
                '<div class="code-line indent"><span class="tok-var">motto</span><span class="tok-punct">:</span> <span class="tok-str">"\u7528\u4EE3\u7801\u70B9\u4EAE\u6570\u5B57\u4E16\u754C"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent"><span class="tok-var">status</span><span class="tok-punct">:</span> <span class="tok-str">"co-creating the future"</span></div>',
                '<div class="code-line"><span class="tok-punct">}</span></div>',
                '<div class="code-line"><span class="tok-comment">// </span><span class="tok-ok">\u2714 compiled \u2014 no errors</span></div>'
            ]
        },
        result: {
            statusText: "\u2714 running",
            statusCls: "is-running",
            showHint: false,
            lines: [
                '<div class="code-line"><span class="tok-comment">// valkjin \u2014 creative developer</span></div>',
                '<div class="code-line"><span class="tok-kw">const</span> <span class="tok-var">developer</span> <span class="tok-punct">=</span> <span class="tok-punct">{</span></div>',
                '<div class="code-line indent"><span class="tok-var">role</span><span class="tok-punct">:</span> <span class="tok-str">"\u524D\u7AEF\u67B6\u6784 \u00D7 AI"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent"><span class="tok-var">stack</span><span class="tok-punct">:</span> <span class="tok-punct">[</span><span class="tok-str">"LLM"</span><span class="tok-punct">,</span> <span class="tok-str">"\u81EA\u52A8\u5316"</span><span class="tok-punct">,</span> <span class="tok-str">"\u521B\u610F\u5DE5\u5177"</span><span class="tok-punct">]</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent"><span class="tok-var">motto</span><span class="tok-punct">:</span> <span class="tok-str">"\u7528\u4EE3\u7801\u70B9\u4EAE\u6570\u5B57\u4E16\u754C"</span><span class="tok-punct">,</span></div>',
                '<div class="code-line indent"><span class="tok-var">status</span><span class="tok-punct">:</span> <span class="tok-str">"co-creating the future"</span></div>',
                '<div class="code-line"><span class="tok-punct">}</span></div>',
                '<div class="code-line result-line"><span class="tok-comment">// </span><span class="tok-ok">\u2714 run \u2192</span> <span class="tok-str">"co-creating the future"</span></div>'
            ]
        }
    };

    var ORDER = ["error", "fixed", "result"];
    var current = 0; // 初始 error（与 HTML data-state 一致）
    var switching = false;

    // 给一行加 line-in，如果是错误行则延迟加 shake
    function showLine(line, i) {
        setTimeout(function () {
            line.classList.add("line-in");
            if (line.classList.contains("error-line")) {
                setTimeout(function () { line.classList.add("shake"); }, 280);
            }
        }, 45 * i);
    }

    function render(stateKey) {
        var s = STATES[stateKey];
        if (!s) return;

        // 淡出当前内容
        content.classList.add("switching");

        setTimeout(function () {
            // 替换内容
            content.innerHTML = s.lines.join("");
            content.classList.remove("switching");

            // 触发逐行入场
            var lines = content.querySelectorAll(".code-line");
            void content.offsetHeight; // 强制重排
            lines.forEach(function (l, i) { showLine(l, i); });

            // 更新 data-state
            body.setAttribute("data-state", stateKey);

            // 更新状态栏
            if (statusEl) {
                statusEl.classList.remove("is-error", "is-fixed", "is-running", "is-ready");
                statusEl.classList.add(s.statusCls);
            }
            if (statusText) {
                statusText.textContent = s.statusText;
            }

            // 更新提示
            if (hint) {
                hint.classList.toggle("visible", s.showHint);
            }

            // 通知 hero-sync.js 状态变化（联动头像+签名微变色）
            document.dispatchEvent(new CustomEvent("editor-state-change", { detail: { state: stateKey } }));
        }, 160);
    }

    function next() {
        if (switching) return;
        switching = true;
        current = (current + 1) % ORDER.length;
        render(ORDER[current]);
        setTimeout(function () { switching = false; }, 750);
    }

    // 点击编辑器主体触发切换（排除终端输入框区域，避免干扰彩蛋）
    body.addEventListener("click", function (e) {
        if (e.target.closest(".hero-terminal")) return;
        next();
    });

    // 键盘可访问性：Enter/Space 触发（但不在终端输入框内）
    body.addEventListener("keydown", function (e) {
        if (e.target.closest(".hero-terminal")) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            next();
        }
    });

    // 初始入场函数（叙事链模式由 hero-sync.js 触发，自动模式立即执行）
    function startInitialEntry() {
        var initLines = content.querySelectorAll(".code-line");
        initLines.forEach(function (l, i) {
            setTimeout(function () {
                l.classList.add("line-in");
                if (l.classList.contains("error-line")) {
                    setTimeout(function () { l.classList.add("shake"); }, 280);
                }
            }, 100 + 45 * i);
        });
        // 等待入场后显示交互提示
        setTimeout(function () {
            if (hint && STATES[ORDER[current]].showHint) {
                hint.classList.add("visible");
            }
        }, 1800);
    }

    // 入场控制：叙事链模式等待事件触发，否则自动入场
    if (document.body.dataset.narrativeWait) {
        var narrativeStarted = false;
        function narrativeEnter() {
            if (narrativeStarted) return;
            narrativeStarted = true;
            startInitialEntry();
        }
        document.addEventListener("narrative-code-enter", narrativeEnter);
        // Fallback：5s 内未收到事件 → 自动开始（防止 hero-sync.js 异常时代码框永远不显示）
        setTimeout(narrativeEnter, 5000);
    } else {
        startInitialEntry();
    }
}();
