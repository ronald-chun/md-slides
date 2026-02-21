const { createApp, ref, watch, onMounted, computed, nextTick } = Vue;
createApp({
    setup() {
        const STORAGE_KEY = 'slides_cursor_sync';
        const WIDTH_KEY = 'slides_width_cursor_sync';
        const THEME_KEY = 'slides_theme_cursor_sync';

        const DEFAULT_CONTENT = `# MD Slides
        
### Markdown 轉 Slides 的簡易工具
---

## 🎨 基礎樣式
- **Bold** / *Italic* / ~~Strikethrough~~
- [External Link](https://revealjs.com)
- \`Inline Code\`
- > "This is a blockquote." - MD Slides

---

## 🔢 列表與任務
1. 第一項
2. 第二項
   - 子項目 A
- [x] 完成 Markdown 功能
- [ ] 加入 AI 內容

---

## 🎭 Fragments (逐步顯示)
<!-- .element: class="fragment" -->
撳「下一個」會見到我：
- 逐行出現 <!-- .element: class="fragment" -->
- 漸變效果 <!-- .element: class="fragment" -->

---

## 🐍 代碼高亮
\`\`\`python
def factorial(n):
    return 1 if n <= 1 else n * factorial(n-1)
\`\`\`

---

## 📐 數學公式 (LaTeX)
當你需要寫公式：
$E = mc^2$

$$
\\Gamma(z) = \\int_0^\\infty t^{z-1}e^{-t}dt
$$

---

## ↕️ 垂直 Slide 測試
(撳「下」箭咀進入子章節)

--v--

### 垂直子頁 1
呢頁係垂直向下跳返嚟嘅。

--v--

### 垂直子頁 2
可以無限向下延伸...

---

<!-- .slide: data-background="#3498db" -->
## 🌈 背景色與圖片
(呢頁用咗藍色背景)

---

## 📝 講者備註
撳 **S** 試吓開唔開到 Speaker Notes！

Note: 呢句係 Speaker Note，只有講者見到。

---

# 🏁 搞掂！
撳左邊個 **Export** 掣攞走個 Standalone file 啦！`;

        const markdownInput = ref(localStorage.getItem(STORAGE_KEY) || DEFAULT_CONTENT);
        const selectedTheme = ref(localStorage.getItem(THEME_KEY) || 'black');
        const activeTab = ref('edit');
        const isSyncing = ref(false);
        const isCollapsed = ref(false);
        const editorWidth = ref(parseInt(localStorage.getItem(WIDTH_KEY)) || 400);
        const isDragging = ref(false);
        const renderReveal = ref(true);
        const revealRef = ref(null);
        const themes = ['black', 'white', 'league', 'beige', 'night', 'serif', 'simple', 'solarized'];
        let deck = null;

        const startDragging = () => { isDragging.value = true; };

        const syncSlideOnCursor = (e) => {
            if (!deck) return;
            const target = e ? e.target : document.querySelector('textarea');
            if (!target) return;
            const cursorSource = target.value.substring(0, target.selectionStart);
            const hSections = cursorSource.split(/\n---\n/);
            const h = hSections.length - 1;
            const v = hSections[hSections.length - 1].split(/\n--v--\n/).length - 1;
            deck.slide(h, v);
        };

        const slidesHtml = computed(() => {
            const hSections = markdownInput.value.split(/\n---\n/);
            return hSections.map(h => {
                const vSections = h.split(/\n--v--\n/);
                if (vSections.length > 1) {
                    const inner = vSections.map(v => `<section data-markdown><script type="text/template">${v.trim()}<\/script></section>`).join('');
                    return `<section>${inner}</section>`;
                }
                return `<section data-markdown><script type="text/template">${h.trim()}<\/script></section>`;
            }).join('');
        });

        const slideCount = computed(() => markdownInput.value.split(/\n---|\n--v--/).length);

        const initReveal = async () => {
            renderReveal.value = false;
            await nextTick();
            renderReveal.value = true;
            await nextTick();
            if (deck) { try { deck.destroy(); } catch (e) {} }
            deck = new Reveal(revealRef.value, {
                embedded: true, plugins: [ RevealMarkdown, RevealHighlight, RevealMath.KaTeX, RevealNotes ],
                center: true, hash: false, mouseWheel: false, controlsV: true
            });
            deck.initialize();
        };

        const updateTheme = () => {
            const el = document.getElementById('reveal-theme');
            if (el) el.href = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/${selectedTheme.value}.min.css`;
            localStorage.setItem(THEME_KEY, selectedTheme.value);
            if(deck) initReveal();
        };

        const resetContent = () => { if(confirm('Reset all?')) markdownInput.value = DEFAULT_CONTENT; };

        const exportHtml = () => {
            const themeUrl = `https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/theme/${selectedTheme.value}.min.css`;
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.css"><link rel="stylesheet" href="${themeUrl}"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/plugin/highlight/monokai.min.css"></head><body><div class="reveal"><div class="slides">${slidesHtml.value}</div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/reveal.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/plugin/markdown/markdown.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/plugin/highlight/highlight.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/plugin/math/math.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.5.0/plugin/notes/notes.min.js"><\/script><script>Reveal.initialize({ plugins: [RevealMarkdown, RevealHighlight, RevealMath.KaTeX, RevealNotes], center: true, controlsV: true });<\/script></body></html>`;
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'presentation.html'; a.click();
        };

        watch(markdownInput, (newVal) => {
            localStorage.setItem(STORAGE_KEY, newVal);
            isSyncing.value = true;
            clearTimeout(window.st);
            window.st = setTimeout(() => { 
                initReveal().then(() => {
                    isSyncing.value = false;
                    syncSlideOnCursor(); 
                }); 
            }, 800);
        });

        watch(isCollapsed, () => { setTimeout(() => { if(deck) deck.layout(); }, 350); });

        onMounted(() => {
            window.addEventListener('mousemove', (e) => {
                if (!isDragging.value) return;
                if (e.clientX > 200 && e.clientX < window.innerWidth * 0.8) editorWidth.value = e.clientX;
            });
            window.addEventListener('mouseup', () => {
                if (isDragging.value) {
                    isDragging.value = false;
                    localStorage.setItem(WIDTH_KEY, editorWidth.value);
                    if(deck) deck.layout();
                }
            });
            updateTheme();
            initReveal();
        });

        return { markdownInput, slidesHtml, revealRef, isSyncing, selectedTheme, themes, updateTheme, resetContent, exportHtml, renderReveal, isCollapsed, editorWidth, startDragging, isDragging, slideCount, activeTab, syncSlideOnCursor };
    }
}).mount('#app');
