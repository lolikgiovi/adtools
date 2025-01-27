export class DependencyLoader {
    static #LOAD_TIMEOUT = 1000; // 1 second timeout
    static #MAX_RETRIES = 2;

    static #dependencies = {
        jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js",
        beautifier: "https://cdnjs.cloudflare.com/ajax/libs/js-beautify/1.14.0/beautify-html.min.js",
        codemirror: {
            js: {
                core: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js",
                modes: ["https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/mode/sql/sql.min.js"]
            },
            css: [
                "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.css",
                "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/elegant.min.css",
                "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/material.min.css"
            ]
        }
    };

    static #loadedDependencies = new Set();

    static async loadDependency(name) {
        if (this.#loadedDependencies.has(name)) {
            return Promise.resolve();
        }

        const dep = this.#dependencies[name];
        if (!dep) {
            return Promise.reject(new Error(`Unknown dependency: ${name}`));
        }

        if (typeof dep === 'string') {
            return this.#loadScript(name, dep);
        } else {
            const promises = [];
            if (dep.js) {
                if (name === 'codemirror') {
                    // Load core first, then modes
                    await this.#loadScript(name, dep.js.core);
                    if (dep.js.modes) {
                        await Promise.all(dep.js.modes.map(url => this.#loadScript(name, url)));
                    }
                } else {
                    promises.push(Promise.all(dep.js.map(url => this.#loadScript(name, url))));
                }
            }
            if (dep.css) {
                promises.push(this.#loadCSS(name, dep.css));
            }
            return Promise.all(promises);
        }
    }

    static #verifyDependency(name) {
        switch(name) {
            case 'jszip':
                return typeof window.JSZip !== 'undefined';
            case 'codemirror':
                return typeof window.CodeMirror !== 'undefined';
            case 'beautifier':
                return typeof window.html_beautify !== 'undefined';
            default:
                return true;
        }
    }

    static #loadWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Loading timeout')), timeout);
            })
        ]);
    }

    static async #loadWithRetry(loadFn, name, maxRetries = this.#MAX_RETRIES) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.#loadWithTimeout(loadFn(), this.#LOAD_TIMEOUT);
                if (this.#verifyDependency(name)) {
                    return;
                }
                throw new Error(`Dependency ${name} loaded but verification failed`);
            } catch (error) {
                if (attempt === maxRetries) {
                    throw new Error(`Failed to load ${name} after ${maxRetries} retries: ${error.message}`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    }

    static #loadScript(name, url) {
        return this.#loadWithRetry(() => new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = url;
            script.onload = () => {
                this.#loadedDependencies.add(name);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load ${name} from ${url}`));
            document.head.appendChild(script);
        }), name);
    }

    static #loadCSS(name, urls) {
        return this.#loadWithRetry(() => Promise.all(urls.map(url => {
            return new Promise((resolve, reject) => {
                const link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = url;
                link.onload = resolve;
                link.onerror = () => reject(new Error(`Failed to load CSS ${name} from ${url}`));
                document.head.appendChild(link);
            });
        })).then(() => {
            this.#loadedDependencies.add(name);
        }), name);
    }

    static async loadAll() {
        const dependencies = Object.keys(this.#dependencies);
        await Promise.all(dependencies.map(dep => this.loadDependency(dep)));
        console.log("All Dependencies Loaded");
    }

    static isLoaded(name) {
        return this.#loadedDependencies.has(name);
    }
}