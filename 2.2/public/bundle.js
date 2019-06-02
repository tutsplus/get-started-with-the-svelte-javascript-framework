
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

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
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

	const file = "src\\components\\HelloForm.svelte";

	function create_fragment(ctx) {
		var h4, t1, p, t2, t3, t4, form, div0, label0, t6, input0, t7, div1, label1, t9, input1, dispose;

		return {
			c: function create() {
				h4 = element("h4");
				h4.textContent = "Tell Us About Yourself";
				t1 = space();
				p = element("p");
				t2 = text("Hello, ");
				t3 = text(ctx.fullname);
				t4 = space();
				form = element("form");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "First Name:";
				t6 = space();
				input0 = element("input");
				t7 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Last Name:";
				t9 = space();
				input1 = element("input");
				add_location(h4, file, 0, 0, 0);
				add_location(p, file, 2, 0, 35);
				label0.htmlFor = "first-name";
				add_location(label0, file, 6, 8, 90);
				attr(input0, "type", "text");
				input0.id = "first-name";
				add_location(input0, file, 7, 8, 143);
				add_location(div0, file, 5, 4, 75);
				label1.htmlFor = "last-name";
				add_location(label1, file, 10, 8, 234);
				attr(input1, "type", "text");
				input1.id = "last-name";
				add_location(input1, file, 11, 8, 285);
				add_location(div1, file, 9, 4, 219);
				add_location(form, file, 4, 0, 63);

				dispose = [
					listen(input0, "input", ctx.input0_input_handler),
					listen(input1, "input", ctx.input1_input_handler)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, h4, anchor);
				insert(target, t1, anchor);
				insert(target, p, anchor);
				append(p, t2);
				append(p, t3);
				insert(target, t4, anchor);
				insert(target, form, anchor);
				append(form, div0);
				append(div0, label0);
				append(div0, t6);
				append(div0, input0);

				input0.value = ctx.firstname;

				append(form, t7);
				append(form, div1);
				append(div1, label1);
				append(div1, t9);
				append(div1, input1);

				input1.value = ctx.lastname;
			},

			p: function update(changed, ctx) {
				if (changed.fullname) {
					set_data(t3, ctx.fullname);
				}

				if (changed.firstname && (input0.value !== ctx.firstname)) input0.value = ctx.firstname;
				if (changed.lastname && (input1.value !== ctx.lastname)) input1.value = ctx.lastname;
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(h4);
					detach(t1);
					detach(p);
					detach(t4);
					detach(form);
				}

				run_all(dispose);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let firstname = '';
	    let lastname = '';

		function input0_input_handler() {
			firstname = this.value;
			$$invalidate('firstname', firstname);
		}

		function input1_input_handler() {
			lastname = this.value;
			$$invalidate('lastname', lastname);
		}

		let fullname;

		$$self.$$.update = ($$dirty = { firstname: 1, lastname: 1 }) => {
			if ($$dirty.firstname || $$dirty.lastname) { $$invalidate('fullname', fullname = `${firstname} ${lastname}`); }
		};

		return {
			firstname,
			lastname,
			fullname,
			input0_input_handler,
			input1_input_handler
		};
	}

	class HelloForm extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	/* src\App.svelte generated by Svelte v3.4.2 */

	function create_fragment$1(ctx) {
		var current;

		var helloform = new HelloForm({ $$inline: true });

		return {
			c: function create() {
				helloform.$$.fragment.c();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				mount_component(helloform, target, anchor);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				helloform.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				helloform.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				helloform.$destroy(detaching);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { name } = $$props;

		$$self.$set = $$props => {
			if ('name' in $$props) $$invalidate('name', name = $$props.name);
		};

		return { name };
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
