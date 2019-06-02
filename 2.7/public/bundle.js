
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

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function prevent_default(fn) {
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function toggle_class(element, name, toggle) {
		element.classList[toggle ? 'add' : 'remove'](name);
	}

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
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

	function createEventDispatcher() {
		const component = current_component;

		return (type, detail) => {
			const callbacks = component.$$.callbacks[type];

			if (callbacks) {
				// TODO are there situations where events could be dispatched
				// in a server (non-DOM) environment?
				const event = custom_event(type, detail);
				callbacks.slice().forEach(fn => {
					fn.call(component, event);
				});
			}
		};
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

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
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

	/* src\components\Navlink.svelte generated by Svelte v3.4.2 */

	const file = "src\\components\\Navlink.svelte";

	function create_fragment(ctx) {
		var a, t, dispose;

		return {
			c: function create() {
				a = element("a");
				t = text(ctx.text);
				a.href = ctx.href;
				a.className = "svelte-tfaudx";
				toggle_class(a, "active", ctx.active);
				add_location(a, file, 0, 0, 0);
				dispose = listen(a, "click", prevent_default(ctx.handleClick));
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
				append(a, t);
			},

			p: function update(changed, ctx) {
				if (changed.text) {
					set_data(t, ctx.text);
				}

				if (changed.href) {
					a.href = ctx.href;
				}

				if (changed.active) {
					toggle_class(a, "active", ctx.active);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				dispose();
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { href= '#', text = '', active = false } = $$props;

	let dispatch = createEventDispatcher();

	function handleClick() {
	    dispatch('activate', {
	        text
	    });
	}

		$$self.$set = $$props => {
			if ('href' in $$props) $$invalidate('href', href = $$props.href);
			if ('text' in $$props) $$invalidate('text', text = $$props.text);
			if ('active' in $$props) $$invalidate('active', active = $$props.active);
		};

		return { href, text, active, handleClick };
	}

	class Navlink extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["href", "text", "active"]);
		}

		get href() {
			throw new Error("<Navlink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set href(value) {
			throw new Error("<Navlink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get text() {
			throw new Error("<Navlink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set text(value) {
			throw new Error("<Navlink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get active() {
			throw new Error("<Navlink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set active(value) {
			throw new Error("<Navlink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\Navbar.svelte generated by Svelte v3.4.2 */

	const file$1 = "src\\components\\Navbar.svelte";

	// (7:4) {:else}
	function create_else_block(ctx) {
		var li0, t0, li1, t1, li2, current_1;

		var navlink0 = new Navlink({
			props: {
			href: '#',
			text: 'Dashboard',
			active: ctx.current === 'Dashboard'
		},
			$$inline: true
		});
		navlink0.$on("activate", ctx.changeCurrent);

		var navlink1 = new Navlink({
			props: {
			href: '#',
			text: 'Profile',
			active: ctx.current === 'Profile'
		},
			$$inline: true
		});
		navlink1.$on("activate", ctx.changeCurrent);

		var navlink2 = new Navlink({
			props: {
			href: '#',
			text: 'Logout',
			active: ctx.current === 'Logout'
		},
			$$inline: true
		});
		navlink2.$on("activate", ctx.changeCurrent);

		return {
			c: function create() {
				li0 = element("li");
				navlink0.$$.fragment.c();
				t0 = space();
				li1 = element("li");
				navlink1.$$.fragment.c();
				t1 = space();
				li2 = element("li");
				navlink2.$$.fragment.c();
				li0.className = "svelte-1wjc0r7";
				add_location(li0, file$1, 7, 8, 127);
				li1.className = "svelte-1wjc0r7";
				add_location(li1, file$1, 15, 8, 353);
				li2.className = "svelte-1wjc0r7";
				add_location(li2, file$1, 23, 8, 575);
			},

			m: function mount(target, anchor) {
				insert(target, li0, anchor);
				mount_component(navlink0, li0, null);
				insert(target, t0, anchor);
				insert(target, li1, anchor);
				mount_component(navlink1, li1, null);
				insert(target, t1, anchor);
				insert(target, li2, anchor);
				mount_component(navlink2, li2, null);
				current_1 = true;
			},

			p: function update(changed, ctx) {
				var navlink0_changes = {};
				if (changed.current) navlink0_changes.active = ctx.current === 'Dashboard';
				navlink0.$set(navlink0_changes);

				var navlink1_changes = {};
				if (changed.current) navlink1_changes.active = ctx.current === 'Profile';
				navlink1.$set(navlink1_changes);

				var navlink2_changes = {};
				if (changed.current) navlink2_changes.active = ctx.current === 'Logout';
				navlink2.$set(navlink2_changes);
			},

			i: function intro(local) {
				if (current_1) return;
				navlink0.$$.fragment.i(local);

				navlink1.$$.fragment.i(local);

				navlink2.$$.fragment.i(local);

				current_1 = true;
			},

			o: function outro(local) {
				navlink0.$$.fragment.o(local);
				navlink1.$$.fragment.o(local);
				navlink2.$$.fragment.o(local);
				current_1 = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li0);
				}

				navlink0.$destroy();

				if (detaching) {
					detach(t0);
					detach(li1);
				}

				navlink1.$destroy();

				if (detaching) {
					detach(t1);
					detach(li2);
				}

				navlink2.$destroy();
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
				add_location(a, file$1, 4, 12, 68);
				li.className = "svelte-1wjc0r7";
				add_location(li, file$1, 3, 8, 50);
			},

			m: function mount(target, anchor) {
				insert(target, li, anchor);
				append(li, a);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(li);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		var div, ul, current_block_type_index, if_block, current_1;

		var if_block_creators = [
			create_if_block,
			create_else_block
		];

		var if_blocks = [];

		function select_block_type(ctx) {
			if (!ctx.user.isAuth) return 0;
			return 1;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		return {
			c: function create() {
				div = element("div");
				ul = element("ul");
				if_block.c();
				ul.className = "svelte-1wjc0r7";
				add_location(ul, file$1, 1, 4, 11);
				div.className = "svelte-1wjc0r7";
				add_location(div, file$1, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, ul);
				if_blocks[current_block_type_index].m(ul, null);
				current_1 = true;
			},

			p: function update(changed, ctx) {
				var previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);
				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(changed, ctx);
				} else {
					group_outros();
					on_outro(() => {
						if_blocks[previous_block_index].d(1);
						if_blocks[previous_block_index] = null;
					});
					if_block.o(1);
					check_outros();

					if_block = if_blocks[current_block_type_index];
					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					}
					if_block.i(1);
					if_block.m(ul, null);
				}
			},

			i: function intro(local) {
				if (current_1) return;
				if (if_block) if_block.i();
				current_1 = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current_1 = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				if_blocks[current_block_type_index].d();
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { user = {} } = $$props;

	let current = 'Dashboard';

	function changeCurrent(event) {
	    $$invalidate('current', current = event.detail.text);
	}

		$$self.$set = $$props => {
			if ('user' in $$props) $$invalidate('user', user = $$props.user);
		};

		return { user, current, changeCurrent };
	}

	class Navbar extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["user"]);
		}

		get user() {
			throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set user(value) {
			throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\App.svelte generated by Svelte v3.4.2 */

	function create_fragment$2(ctx) {
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

	function instance$2($$self, $$props, $$invalidate) {
		

		let { name } = $$props;

		let items = [];

		onMount(async () => {
			let response = await fetch('guitars.json');

			$$invalidate('items', items = await response.json());
		});

		let user = {
			isAuth: true
		};

		$$self.$set = $$props => {
			if ('name' in $$props) $$invalidate('name', name = $$props.name);
		};

		return { name, user };
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["name"]);

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
