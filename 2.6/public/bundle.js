
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	/* src\components\HelloForm.svelte generated by Svelte v3.4.2 */

	/* src\components\ManualList.svelte generated by Svelte v3.4.2 */

	/* src\components\List.svelte generated by Svelte v3.4.2 */

	/* src\components\Navbar.svelte generated by Svelte v3.4.2 */

	const file = "src\\components\\Navbar.svelte";

	// (7:4) {:else}
	function create_else_block(ctx) {
		var li0, a0, t1, li1, a1, t3, li2, a2;

		return {
			c: function create() {
				li0 = element("li");
				a0 = element("a");
				a0.textContent = "Dashboard";
				t1 = space();
				li1 = element("li");
				a1 = element("a");
				a1.textContent = "Profile";
				t3 = space();
				li2 = element("li");
				a2 = element("a");
				a2.textContent = "Logout";
				a0.href = "#";
				a0.className = "svelte-yysmxv";
				add_location(a0, file, 8, 12, 145);
				li0.className = "svelte-yysmxv";
				add_location(li0, file, 7, 8, 127);
				a1.href = "#";
				a1.className = "svelte-yysmxv";
				add_location(a1, file, 11, 12, 213);
				li1.className = "svelte-yysmxv";
				add_location(li1, file, 10, 8, 195);
				a2.href = "#";
				a2.className = "svelte-yysmxv";
				add_location(a2, file, 14, 12, 279);
				li2.className = "svelte-yysmxv";
				add_location(li2, file, 13, 8, 261);
			},

			m: function mount(target, anchor) {
				insert(target, li0, anchor);
				append(li0, a0);
				insert(target, t1, anchor);
				insert(target, li1, anchor);
				append(li1, a1);
				insert(target, t3, anchor);
				insert(target, li2, anchor);
				append(li2, a2);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li0);
					detach(t1);
					detach(li1);
					detach(t3);
					detach(li2);
				}
			}
		};
	}

	// (3:4) {#if !user.isAuth }
	function create_if_block(ctx) {
		var li, a;

		return {
			c: function create() {
				li = element("li");
				a = element("a");
				a.textContent = "Login";
				a.href = "#";
				a.className = "svelte-yysmxv";
				add_location(a, file, 4, 12, 68);
				li.className = "svelte-yysmxv";
				add_location(li, file, 3, 8, 50);
			},

			m: function mount(target, anchor) {
				insert(target, li, anchor);
				append(li, a);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var div, ul;

		function select_block_type(ctx) {
			if (!ctx.user.isAuth) return create_if_block;
			return create_else_block;
		}

		var current_block_type = select_block_type(ctx);
		var if_block = current_block_type(ctx);

		return {
			c: function create() {
				div = element("div");
				ul = element("ul");
				if_block.c();
				ul.className = "svelte-yysmxv";
				add_location(ul, file, 1, 4, 11);
				div.className = "svelte-yysmxv";
				add_location(div, file, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, ul);
				if_block.m(ul, null);
			},

			p: function update(changed, ctx) {
				if (current_block_type !== (current_block_type = select_block_type(ctx))) {
					if_block.d(1);
					if_block = current_block_type(ctx);
					if (if_block) {
						if_block.c();
						if_block.m(ul, null);
					}
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if_block.d();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { user = {} } = $$props;

		$$self.$set = $$props => {
			if ('user' in $$props) $$invalidate('user', user = $$props.user);
		};

		return { user };
	}

	class Navbar extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["user"]);
		}

		get user() {
			throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set user(value) {
			throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\App.svelte generated by Svelte v3.4.2 */

	function create_fragment$1(ctx) {
		var current;

		var navbar = new Navbar({
			props: { user: ctx.user },
			$$inline: true
		});

		return {
			c: function create() {
				navbar.$$.fragment.c();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				mount_component(navbar, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var navbar_changes = {};
				if (changed.user) navbar_changes.user = ctx.user;
				navbar.$set(navbar_changes);
			},

			i: function intro(local) {
				if (current) return;
				navbar.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				navbar.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				navbar.$destroy(detaching);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		

		let { name } = $$props;

		let items = [];

		onMount(async () => {
			let response = await fetch('guitars.json');

			$$invalidate('items', items = await response.json());
		});

		let user = {
			isAuth: false
		};

		$$self.$set = $$props => {
			if ('name' in $$props) $$invalidate('name', name = $$props.name);
		};

		return { name, user };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["name"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.name === undefined && !('name' in props)) {
				console.warn("<App> was created without expected prop 'name'");
			}
		}

		get name() {
			throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set name(value) {
			throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
