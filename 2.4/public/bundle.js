
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

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
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

	function custom_event(type, detail) {
		const e = document.createEvent('CustomEvent');
		e.initCustomEvent(type, false, false, detail);
		return e;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
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

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
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

	const file = "src\\components\\ManualList.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.guitar = list[i];
		return child_ctx;
	}

	// (11:4) {#each guitars as guitar}
	function create_each_block(ctx) {
		var li, t_value = ctx.guitar, t;

		return {
			c: function create() {
				li = element("li");
				t = text(t_value);
				add_location(li, file, 11, 8, 272);
			},

			m: function mount(target, anchor) {
				insert(target, li, anchor);
				append(li, t);
			},

			p: function update(changed, ctx) {
				if ((changed.guitars) && t_value !== (t_value = ctx.guitar)) {
					set_data(t, t_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(li);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var form, div0, input, t0, div1, button, t2, ul, dispose;

		var each_value = ctx.guitars;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				form = element("form");
				div0 = element("div");
				input = element("input");
				t0 = space();
				div1 = element("div");
				button = element("button");
				button.textContent = "Add Guitar";
				t2 = space();
				ul = element("ul");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				attr(input, "type", "text");
				add_location(input, file, 2, 8, 37);
				add_location(div0, file, 1, 4, 22);
				add_location(button, file, 5, 8, 139);
				add_location(div1, file, 4, 4, 124);
				form.action = "";
				add_location(form, file, 0, 0, 0);
				add_location(ul, file, 9, 0, 227);

				dispose = [
					listen(input, "input", ctx.input_input_handler),
					listen(button, "click", prevent_default(ctx.addGuitar))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, form, anchor);
				append(form, div0);
				append(div0, input);

				input.value = ctx.guitarInput;

				add_binding_callback(() => ctx.input_binding(input, null));
				append(form, t0);
				append(form, div1);
				append(div1, button);
				insert(target, t2, anchor);
				insert(target, ul, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(ul, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.guitarInput && (input.value !== ctx.guitarInput)) input.value = ctx.guitarInput;
				if (changed.items) {
					ctx.input_binding(null, input);
					ctx.input_binding(input, null);
				}

				if (changed.guitars) {
					each_value = ctx.guitars;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(ul, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(form);
				}

				ctx.input_binding(null, input);

				if (detaching) {
					detach(t2);
					detach(ul);
				}

				destroy_each(each_blocks, detaching);

				run_all(dispose);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let dispatch = createEventDispatcher();

	    let guitarInput = '';
	    let guitars = [];
	    let inputElement;

	    function addGuitar() {
	        $$invalidate('guitars', guitars = [...guitars, guitarInput]);

	        dispatch('new-item', {
	            value: guitarInput
	        });
	        
	        $$invalidate('guitarInput', guitarInput = '');

	        inputElement.focus();
	    }

		function input_input_handler() {
			guitarInput = this.value;
			$$invalidate('guitarInput', guitarInput);
		}

		function input_binding($$node, check) {
			inputElement = $$node;
			$$invalidate('inputElement', inputElement);
		}

		return {
			guitarInput,
			guitars,
			inputElement,
			addGuitar,
			input_input_handler,
			input_binding
		};
	}

	class ManualList extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	/* src\App.svelte generated by Svelte v3.4.2 */

	function create_fragment$1(ctx) {
		var current;

		var manuallist = new ManualList({ $$inline: true });
		manuallist.$on("new-item", new_item_handler);

		return {
			c: function create() {
				manuallist.$$.fragment.c();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				mount_component(manuallist, target, anchor);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				manuallist.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				manuallist.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				manuallist.$destroy(detaching);
			}
		};
	}

	function new_item_handler(event) {
		return console.log(`New Item: ${event.detail.value}`);
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
