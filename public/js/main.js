(() => {
  // node_modules/alpinejs/dist/module.esm.js
  var flushPending = false;
  var flushing = false;
  var queue = [];
  var lastFlushedIndex = -1;
  function scheduler(callback) {
    queueJob(callback);
  }
  function queueJob(job) {
    if (!queue.includes(job))
      queue.push(job);
    queueFlush();
  }
  function dequeueJob(job) {
    let index = queue.indexOf(job);
    if (index !== -1 && index > lastFlushedIndex)
      queue.splice(index, 1);
  }
  function queueFlush() {
    if (!flushing && !flushPending) {
      flushPending = true;
      queueMicrotask(flushJobs);
    }
  }
  function flushJobs() {
    flushPending = false;
    flushing = true;
    for (let i = 0; i < queue.length; i++) {
      queue[i]();
      lastFlushedIndex = i;
    }
    queue.length = 0;
    lastFlushedIndex = -1;
    flushing = false;
  }
  var reactive;
  var effect;
  var release;
  var raw;
  var shouldSchedule = true;
  function disableEffectScheduling(callback) {
    shouldSchedule = false;
    callback();
    shouldSchedule = true;
  }
  function setReactivityEngine(engine) {
    reactive = engine.reactive;
    release = engine.release;
    effect = (callback) => engine.effect(callback, { scheduler: (task) => {
      if (shouldSchedule) {
        scheduler(task);
      } else {
        task();
      }
    } });
    raw = engine.raw;
  }
  function overrideEffect(override) {
    effect = override;
  }
  function elementBoundEffect(el) {
    let cleanup2 = () => {
    };
    let wrappedEffect = (callback) => {
      let effectReference = effect(callback);
      if (!el._x_effects) {
        el._x_effects = /* @__PURE__ */ new Set();
        el._x_runEffects = () => {
          el._x_effects.forEach((i) => i());
        };
      }
      el._x_effects.add(effectReference);
      cleanup2 = () => {
        if (effectReference === void 0)
          return;
        el._x_effects.delete(effectReference);
        release(effectReference);
      };
      return effectReference;
    };
    return [wrappedEffect, () => {
      cleanup2();
    }];
  }
  function watch(getter, callback) {
    let firstTime = true;
    let oldValue;
    let effectReference = effect(() => {
      let value = getter();
      JSON.stringify(value);
      if (!firstTime) {
        queueMicrotask(() => {
          callback(value, oldValue);
          oldValue = value;
        });
      } else {
        oldValue = value;
      }
      firstTime = false;
    });
    return () => release(effectReference);
  }
  var onAttributeAddeds = [];
  var onElRemoveds = [];
  var onElAddeds = [];
  function onElAdded(callback) {
    onElAddeds.push(callback);
  }
  function onElRemoved(el, callback) {
    if (typeof callback === "function") {
      if (!el._x_cleanups)
        el._x_cleanups = [];
      el._x_cleanups.push(callback);
    } else {
      callback = el;
      onElRemoveds.push(callback);
    }
  }
  function onAttributesAdded(callback) {
    onAttributeAddeds.push(callback);
  }
  function onAttributeRemoved(el, name, callback) {
    if (!el._x_attributeCleanups)
      el._x_attributeCleanups = {};
    if (!el._x_attributeCleanups[name])
      el._x_attributeCleanups[name] = [];
    el._x_attributeCleanups[name].push(callback);
  }
  function cleanupAttributes(el, names) {
    if (!el._x_attributeCleanups)
      return;
    Object.entries(el._x_attributeCleanups).forEach(([name, value]) => {
      if (names === void 0 || names.includes(name)) {
        value.forEach((i) => i());
        delete el._x_attributeCleanups[name];
      }
    });
  }
  function cleanupElement(el) {
    if (el._x_cleanups) {
      while (el._x_cleanups.length)
        el._x_cleanups.pop()();
    }
  }
  var observer = new MutationObserver(onMutate);
  var currentlyObserving = false;
  function startObservingMutations() {
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeOldValue: true });
    currentlyObserving = true;
  }
  function stopObservingMutations() {
    flushObserver();
    observer.disconnect();
    currentlyObserving = false;
  }
  var queuedMutations = [];
  function flushObserver() {
    let records = observer.takeRecords();
    queuedMutations.push(() => records.length > 0 && onMutate(records));
    let queueLengthWhenTriggered = queuedMutations.length;
    queueMicrotask(() => {
      if (queuedMutations.length === queueLengthWhenTriggered) {
        while (queuedMutations.length > 0)
          queuedMutations.shift()();
      }
    });
  }
  function mutateDom(callback) {
    if (!currentlyObserving)
      return callback();
    stopObservingMutations();
    let result = callback();
    startObservingMutations();
    return result;
  }
  var isCollecting = false;
  var deferredMutations = [];
  function deferMutations() {
    isCollecting = true;
  }
  function flushAndStopDeferringMutations() {
    isCollecting = false;
    onMutate(deferredMutations);
    deferredMutations = [];
  }
  function onMutate(mutations) {
    if (isCollecting) {
      deferredMutations = deferredMutations.concat(mutations);
      return;
    }
    let addedNodes = /* @__PURE__ */ new Set();
    let removedNodes = /* @__PURE__ */ new Set();
    let addedAttributes = /* @__PURE__ */ new Map();
    let removedAttributes = /* @__PURE__ */ new Map();
    for (let i = 0; i < mutations.length; i++) {
      if (mutations[i].target._x_ignoreMutationObserver)
        continue;
      if (mutations[i].type === "childList") {
        mutations[i].addedNodes.forEach((node) => node.nodeType === 1 && addedNodes.add(node));
        mutations[i].removedNodes.forEach((node) => node.nodeType === 1 && removedNodes.add(node));
      }
      if (mutations[i].type === "attributes") {
        let el = mutations[i].target;
        let name = mutations[i].attributeName;
        let oldValue = mutations[i].oldValue;
        let add2 = () => {
          if (!addedAttributes.has(el))
            addedAttributes.set(el, []);
          addedAttributes.get(el).push({ name, value: el.getAttribute(name) });
        };
        let remove = () => {
          if (!removedAttributes.has(el))
            removedAttributes.set(el, []);
          removedAttributes.get(el).push(name);
        };
        if (el.hasAttribute(name) && oldValue === null) {
          add2();
        } else if (el.hasAttribute(name)) {
          remove();
          add2();
        } else {
          remove();
        }
      }
    }
    removedAttributes.forEach((attrs, el) => {
      cleanupAttributes(el, attrs);
    });
    addedAttributes.forEach((attrs, el) => {
      onAttributeAddeds.forEach((i) => i(el, attrs));
    });
    for (let node of removedNodes) {
      if (addedNodes.has(node))
        continue;
      onElRemoveds.forEach((i) => i(node));
    }
    addedNodes.forEach((node) => {
      node._x_ignoreSelf = true;
      node._x_ignore = true;
    });
    for (let node of addedNodes) {
      if (removedNodes.has(node))
        continue;
      if (!node.isConnected)
        continue;
      delete node._x_ignoreSelf;
      delete node._x_ignore;
      onElAddeds.forEach((i) => i(node));
      node._x_ignore = true;
      node._x_ignoreSelf = true;
    }
    addedNodes.forEach((node) => {
      delete node._x_ignoreSelf;
      delete node._x_ignore;
    });
    addedNodes = null;
    removedNodes = null;
    addedAttributes = null;
    removedAttributes = null;
  }
  function scope(node) {
    return mergeProxies(closestDataStack(node));
  }
  function addScopeToNode(node, data2, referenceNode) {
    node._x_dataStack = [data2, ...closestDataStack(referenceNode || node)];
    return () => {
      node._x_dataStack = node._x_dataStack.filter((i) => i !== data2);
    };
  }
  function closestDataStack(node) {
    if (node._x_dataStack)
      return node._x_dataStack;
    if (typeof ShadowRoot === "function" && node instanceof ShadowRoot) {
      return closestDataStack(node.host);
    }
    if (!node.parentNode) {
      return [];
    }
    return closestDataStack(node.parentNode);
  }
  function mergeProxies(objects) {
    return new Proxy({ objects }, mergeProxyTrap);
  }
  var mergeProxyTrap = {
    ownKeys({ objects }) {
      return Array.from(
        new Set(objects.flatMap((i) => Object.keys(i)))
      );
    },
    has({ objects }, name) {
      if (name == Symbol.unscopables)
        return false;
      return objects.some(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name) || Reflect.has(obj, name)
      );
    },
    get({ objects }, name, thisProxy) {
      if (name == "toJSON")
        return collapseProxies;
      return Reflect.get(
        objects.find(
          (obj) => Reflect.has(obj, name)
        ) || {},
        name,
        thisProxy
      );
    },
    set({ objects }, name, value, thisProxy) {
      const target = objects.find(
        (obj) => Object.prototype.hasOwnProperty.call(obj, name)
      ) || objects[objects.length - 1];
      const descriptor = Object.getOwnPropertyDescriptor(target, name);
      if (descriptor?.set && descriptor?.get)
        return descriptor.set.call(thisProxy, value) || true;
      return Reflect.set(target, name, value);
    }
  };
  function collapseProxies() {
    let keys = Reflect.ownKeys(this);
    return keys.reduce((acc, key) => {
      acc[key] = Reflect.get(this, key);
      return acc;
    }, {});
  }
  function initInterceptors(data2) {
    let isObject2 = (val) => typeof val === "object" && !Array.isArray(val) && val !== null;
    let recurse = (obj, basePath = "") => {
      Object.entries(Object.getOwnPropertyDescriptors(obj)).forEach(([key, { value, enumerable }]) => {
        if (enumerable === false || value === void 0)
          return;
        if (typeof value === "object" && value !== null && value.__v_skip)
          return;
        let path = basePath === "" ? key : `${basePath}.${key}`;
        if (typeof value === "object" && value !== null && value._x_interceptor) {
          obj[key] = value.initialize(data2, path, key);
        } else {
          if (isObject2(value) && value !== obj && !(value instanceof Element)) {
            recurse(value, path);
          }
        }
      });
    };
    return recurse(data2);
  }
  function interceptor(callback, mutateObj = () => {
  }) {
    let obj = {
      initialValue: void 0,
      _x_interceptor: true,
      initialize(data2, path, key) {
        return callback(this.initialValue, () => get(data2, path), (value) => set(data2, path, value), path, key);
      }
    };
    mutateObj(obj);
    return (initialValue) => {
      if (typeof initialValue === "object" && initialValue !== null && initialValue._x_interceptor) {
        let initialize = obj.initialize.bind(obj);
        obj.initialize = (data2, path, key) => {
          let innerValue = initialValue.initialize(data2, path, key);
          obj.initialValue = innerValue;
          return initialize(data2, path, key);
        };
      } else {
        obj.initialValue = initialValue;
      }
      return obj;
    };
  }
  function get(obj, path) {
    return path.split(".").reduce((carry, segment) => carry[segment], obj);
  }
  function set(obj, path, value) {
    if (typeof path === "string")
      path = path.split(".");
    if (path.length === 1)
      obj[path[0]] = value;
    else if (path.length === 0)
      throw error;
    else {
      if (obj[path[0]])
        return set(obj[path[0]], path.slice(1), value);
      else {
        obj[path[0]] = {};
        return set(obj[path[0]], path.slice(1), value);
      }
    }
  }
  var magics = {};
  function magic(name, callback) {
    magics[name] = callback;
  }
  function injectMagics(obj, el) {
    Object.entries(magics).forEach(([name, callback]) => {
      let memoizedUtilities = null;
      function getUtilities() {
        if (memoizedUtilities) {
          return memoizedUtilities;
        } else {
          let [utilities, cleanup2] = getElementBoundUtilities(el);
          memoizedUtilities = { interceptor, ...utilities };
          onElRemoved(el, cleanup2);
          return memoizedUtilities;
        }
      }
      Object.defineProperty(obj, `$${name}`, {
        get() {
          return callback(el, getUtilities());
        },
        enumerable: false
      });
    });
    return obj;
  }
  function tryCatch(el, expression, callback, ...args) {
    try {
      return callback(...args);
    } catch (e) {
      handleError(e, el, expression);
    }
  }
  function handleError(error2, el, expression = void 0) {
    error2 = Object.assign(
      error2 ?? { message: "No error message given." },
      { el, expression }
    );
    console.warn(`Alpine Expression Error: ${error2.message}

${expression ? 'Expression: "' + expression + '"\n\n' : ""}`, el);
    setTimeout(() => {
      throw error2;
    }, 0);
  }
  var shouldAutoEvaluateFunctions = true;
  function dontAutoEvaluateFunctions(callback) {
    let cache = shouldAutoEvaluateFunctions;
    shouldAutoEvaluateFunctions = false;
    let result = callback();
    shouldAutoEvaluateFunctions = cache;
    return result;
  }
  function evaluate(el, expression, extras = {}) {
    let result;
    evaluateLater(el, expression)((value) => result = value, extras);
    return result;
  }
  function evaluateLater(...args) {
    return theEvaluatorFunction(...args);
  }
  var theEvaluatorFunction = normalEvaluator;
  function setEvaluator(newEvaluator) {
    theEvaluatorFunction = newEvaluator;
  }
  function normalEvaluator(el, expression) {
    let overriddenMagics = {};
    injectMagics(overriddenMagics, el);
    let dataStack = [overriddenMagics, ...closestDataStack(el)];
    let evaluator = typeof expression === "function" ? generateEvaluatorFromFunction(dataStack, expression) : generateEvaluatorFromString(dataStack, expression, el);
    return tryCatch.bind(null, el, expression, evaluator);
  }
  function generateEvaluatorFromFunction(dataStack, func) {
    return (receiver = () => {
    }, { scope: scope2 = {}, params = [] } = {}) => {
      let result = func.apply(mergeProxies([scope2, ...dataStack]), params);
      runIfTypeOfFunction(receiver, result);
    };
  }
  var evaluatorMemo = {};
  function generateFunctionFromString(expression, el) {
    if (evaluatorMemo[expression]) {
      return evaluatorMemo[expression];
    }
    let AsyncFunction = Object.getPrototypeOf(async function() {
    }).constructor;
    let rightSideSafeExpression = /^[\n\s]*if.*\(.*\)/.test(expression.trim()) || /^(let|const)\s/.test(expression.trim()) ? `(async()=>{ ${expression} })()` : expression;
    const safeAsyncFunction = () => {
      try {
        let func2 = new AsyncFunction(
          ["__self", "scope"],
          `with (scope) { __self.result = ${rightSideSafeExpression} }; __self.finished = true; return __self.result;`
        );
        Object.defineProperty(func2, "name", {
          value: `[Alpine] ${expression}`
        });
        return func2;
      } catch (error2) {
        handleError(error2, el, expression);
        return Promise.resolve();
      }
    };
    let func = safeAsyncFunction();
    evaluatorMemo[expression] = func;
    return func;
  }
  function generateEvaluatorFromString(dataStack, expression, el) {
    let func = generateFunctionFromString(expression, el);
    return (receiver = () => {
    }, { scope: scope2 = {}, params = [] } = {}) => {
      func.result = void 0;
      func.finished = false;
      let completeScope = mergeProxies([scope2, ...dataStack]);
      if (typeof func === "function") {
        let promise = func(func, completeScope).catch((error2) => handleError(error2, el, expression));
        if (func.finished) {
          runIfTypeOfFunction(receiver, func.result, completeScope, params, el);
          func.result = void 0;
        } else {
          promise.then((result) => {
            runIfTypeOfFunction(receiver, result, completeScope, params, el);
          }).catch((error2) => handleError(error2, el, expression)).finally(() => func.result = void 0);
        }
      }
    };
  }
  function runIfTypeOfFunction(receiver, value, scope2, params, el) {
    if (shouldAutoEvaluateFunctions && typeof value === "function") {
      let result = value.apply(scope2, params);
      if (result instanceof Promise) {
        result.then((i) => runIfTypeOfFunction(receiver, i, scope2, params)).catch((error2) => handleError(error2, el, value));
      } else {
        receiver(result);
      }
    } else if (typeof value === "object" && value instanceof Promise) {
      value.then((i) => receiver(i));
    } else {
      receiver(value);
    }
  }
  var prefixAsString = "x-";
  function prefix(subject = "") {
    return prefixAsString + subject;
  }
  function setPrefix(newPrefix) {
    prefixAsString = newPrefix;
  }
  var directiveHandlers = {};
  function directive(name, callback) {
    directiveHandlers[name] = callback;
    return {
      before(directive2) {
        if (!directiveHandlers[directive2]) {
          console.warn(String.raw`Cannot find directive \`${directive2}\`. \`${name}\` will use the default order of execution`);
          return;
        }
        const pos = directiveOrder.indexOf(directive2);
        directiveOrder.splice(pos >= 0 ? pos : directiveOrder.indexOf("DEFAULT"), 0, name);
      }
    };
  }
  function directiveExists(name) {
    return Object.keys(directiveHandlers).includes(name);
  }
  function directives(el, attributes, originalAttributeOverride) {
    attributes = Array.from(attributes);
    if (el._x_virtualDirectives) {
      let vAttributes = Object.entries(el._x_virtualDirectives).map(([name, value]) => ({ name, value }));
      let staticAttributes = attributesOnly(vAttributes);
      vAttributes = vAttributes.map((attribute) => {
        if (staticAttributes.find((attr) => attr.name === attribute.name)) {
          return {
            name: `x-bind:${attribute.name}`,
            value: `"${attribute.value}"`
          };
        }
        return attribute;
      });
      attributes = attributes.concat(vAttributes);
    }
    let transformedAttributeMap = {};
    let directives2 = attributes.map(toTransformedAttributes((newName, oldName) => transformedAttributeMap[newName] = oldName)).filter(outNonAlpineAttributes).map(toParsedDirectives(transformedAttributeMap, originalAttributeOverride)).sort(byPriority);
    return directives2.map((directive2) => {
      return getDirectiveHandler(el, directive2);
    });
  }
  function attributesOnly(attributes) {
    return Array.from(attributes).map(toTransformedAttributes()).filter((attr) => !outNonAlpineAttributes(attr));
  }
  var isDeferringHandlers = false;
  var directiveHandlerStacks = /* @__PURE__ */ new Map();
  var currentHandlerStackKey = Symbol();
  function deferHandlingDirectives(callback) {
    isDeferringHandlers = true;
    let key = Symbol();
    currentHandlerStackKey = key;
    directiveHandlerStacks.set(key, []);
    let flushHandlers = () => {
      while (directiveHandlerStacks.get(key).length)
        directiveHandlerStacks.get(key).shift()();
      directiveHandlerStacks.delete(key);
    };
    let stopDeferring = () => {
      isDeferringHandlers = false;
      flushHandlers();
    };
    callback(flushHandlers);
    stopDeferring();
  }
  function getElementBoundUtilities(el) {
    let cleanups = [];
    let cleanup2 = (callback) => cleanups.push(callback);
    let [effect3, cleanupEffect] = elementBoundEffect(el);
    cleanups.push(cleanupEffect);
    let utilities = {
      Alpine: alpine_default,
      effect: effect3,
      cleanup: cleanup2,
      evaluateLater: evaluateLater.bind(evaluateLater, el),
      evaluate: evaluate.bind(evaluate, el)
    };
    let doCleanup = () => cleanups.forEach((i) => i());
    return [utilities, doCleanup];
  }
  function getDirectiveHandler(el, directive2) {
    let noop = () => {
    };
    let handler4 = directiveHandlers[directive2.type] || noop;
    let [utilities, cleanup2] = getElementBoundUtilities(el);
    onAttributeRemoved(el, directive2.original, cleanup2);
    let fullHandler = () => {
      if (el._x_ignore || el._x_ignoreSelf)
        return;
      handler4.inline && handler4.inline(el, directive2, utilities);
      handler4 = handler4.bind(handler4, el, directive2, utilities);
      isDeferringHandlers ? directiveHandlerStacks.get(currentHandlerStackKey).push(handler4) : handler4();
    };
    fullHandler.runCleanups = cleanup2;
    return fullHandler;
  }
  var startingWith = (subject, replacement) => ({ name, value }) => {
    if (name.startsWith(subject))
      name = name.replace(subject, replacement);
    return { name, value };
  };
  var into = (i) => i;
  function toTransformedAttributes(callback = () => {
  }) {
    return ({ name, value }) => {
      let { name: newName, value: newValue } = attributeTransformers.reduce((carry, transform) => {
        return transform(carry);
      }, { name, value });
      if (newName !== name)
        callback(newName, name);
      return { name: newName, value: newValue };
    };
  }
  var attributeTransformers = [];
  function mapAttributes(callback) {
    attributeTransformers.push(callback);
  }
  function outNonAlpineAttributes({ name }) {
    return alpineAttributeRegex().test(name);
  }
  var alpineAttributeRegex = () => new RegExp(`^${prefixAsString}([^:^.]+)\\b`);
  function toParsedDirectives(transformedAttributeMap, originalAttributeOverride) {
    return ({ name, value }) => {
      let typeMatch = name.match(alpineAttributeRegex());
      let valueMatch = name.match(/:([a-zA-Z0-9\-_:]+)/);
      let modifiers = name.match(/\.[^.\]]+(?=[^\]]*$)/g) || [];
      let original = originalAttributeOverride || transformedAttributeMap[name] || name;
      return {
        type: typeMatch ? typeMatch[1] : null,
        value: valueMatch ? valueMatch[1] : null,
        modifiers: modifiers.map((i) => i.replace(".", "")),
        expression: value,
        original
      };
    };
  }
  var DEFAULT = "DEFAULT";
  var directiveOrder = [
    "ignore",
    "ref",
    "data",
    "id",
    "anchor",
    "bind",
    "init",
    "for",
    "model",
    "modelable",
    "transition",
    "show",
    "if",
    DEFAULT,
    "teleport"
  ];
  function byPriority(a, b) {
    let typeA = directiveOrder.indexOf(a.type) === -1 ? DEFAULT : a.type;
    let typeB = directiveOrder.indexOf(b.type) === -1 ? DEFAULT : b.type;
    return directiveOrder.indexOf(typeA) - directiveOrder.indexOf(typeB);
  }
  function dispatch(el, name, detail = {}) {
    el.dispatchEvent(
      new CustomEvent(name, {
        detail,
        bubbles: true,
        // Allows events to pass the shadow DOM barrier.
        composed: true,
        cancelable: true
      })
    );
  }
  function walk(el, callback) {
    if (typeof ShadowRoot === "function" && el instanceof ShadowRoot) {
      Array.from(el.children).forEach((el2) => walk(el2, callback));
      return;
    }
    let skip = false;
    callback(el, () => skip = true);
    if (skip)
      return;
    let node = el.firstElementChild;
    while (node) {
      walk(node, callback, false);
      node = node.nextElementSibling;
    }
  }
  function warn(message, ...args) {
    console.warn(`Alpine Warning: ${message}`, ...args);
  }
  var started = false;
  function start() {
    if (started)
      warn("Alpine has already been initialized on this page. Calling Alpine.start() more than once can cause problems.");
    started = true;
    if (!document.body)
      warn("Unable to initialize. Trying to load Alpine before `<body>` is available. Did you forget to add `defer` in Alpine's `<script>` tag?");
    dispatch(document, "alpine:init");
    dispatch(document, "alpine:initializing");
    startObservingMutations();
    onElAdded((el) => initTree(el, walk));
    onElRemoved((el) => destroyTree(el));
    onAttributesAdded((el, attrs) => {
      directives(el, attrs).forEach((handle) => handle());
    });
    let outNestedComponents = (el) => !closestRoot(el.parentElement, true);
    Array.from(document.querySelectorAll(allSelectors().join(","))).filter(outNestedComponents).forEach((el) => {
      initTree(el);
    });
    dispatch(document, "alpine:initialized");
    setTimeout(() => {
      warnAboutMissingPlugins();
    });
  }
  var rootSelectorCallbacks = [];
  var initSelectorCallbacks = [];
  function rootSelectors() {
    return rootSelectorCallbacks.map((fn) => fn());
  }
  function allSelectors() {
    return rootSelectorCallbacks.concat(initSelectorCallbacks).map((fn) => fn());
  }
  function addRootSelector(selectorCallback) {
    rootSelectorCallbacks.push(selectorCallback);
  }
  function addInitSelector(selectorCallback) {
    initSelectorCallbacks.push(selectorCallback);
  }
  function closestRoot(el, includeInitSelectors = false) {
    return findClosest(el, (element) => {
      const selectors = includeInitSelectors ? allSelectors() : rootSelectors();
      if (selectors.some((selector) => element.matches(selector)))
        return true;
    });
  }
  function findClosest(el, callback) {
    if (!el)
      return;
    if (callback(el))
      return el;
    if (el._x_teleportBack)
      el = el._x_teleportBack;
    if (!el.parentElement)
      return;
    return findClosest(el.parentElement, callback);
  }
  function isRoot(el) {
    return rootSelectors().some((selector) => el.matches(selector));
  }
  var initInterceptors2 = [];
  function interceptInit(callback) {
    initInterceptors2.push(callback);
  }
  function initTree(el, walker = walk, intercept = () => {
  }) {
    deferHandlingDirectives(() => {
      walker(el, (el2, skip) => {
        intercept(el2, skip);
        initInterceptors2.forEach((i) => i(el2, skip));
        directives(el2, el2.attributes).forEach((handle) => handle());
        el2._x_ignore && skip();
      });
    });
  }
  function destroyTree(root, walker = walk) {
    walker(root, (el) => {
      cleanupAttributes(el);
      cleanupElement(el);
    });
  }
  function warnAboutMissingPlugins() {
    let pluginDirectives = [
      ["ui", "dialog", ["[x-dialog], [x-popover]"]],
      ["anchor", "anchor", ["[x-anchor]"]],
      ["sort", "sort", ["[x-sort]"]]
    ];
    pluginDirectives.forEach(([plugin2, directive2, selectors]) => {
      if (directiveExists(directive2))
        return;
      selectors.some((selector) => {
        if (document.querySelector(selector)) {
          warn(`found "${selector}", but missing ${plugin2} plugin`);
          return true;
        }
      });
    });
  }
  var tickStack = [];
  var isHolding = false;
  function nextTick(callback = () => {
  }) {
    queueMicrotask(() => {
      isHolding || setTimeout(() => {
        releaseNextTicks();
      });
    });
    return new Promise((res) => {
      tickStack.push(() => {
        callback();
        res();
      });
    });
  }
  function releaseNextTicks() {
    isHolding = false;
    while (tickStack.length)
      tickStack.shift()();
  }
  function holdNextTicks() {
    isHolding = true;
  }
  function setClasses(el, value) {
    if (Array.isArray(value)) {
      return setClassesFromString(el, value.join(" "));
    } else if (typeof value === "object" && value !== null) {
      return setClassesFromObject(el, value);
    } else if (typeof value === "function") {
      return setClasses(el, value());
    }
    return setClassesFromString(el, value);
  }
  function setClassesFromString(el, classString) {
    let split = (classString2) => classString2.split(" ").filter(Boolean);
    let missingClasses = (classString2) => classString2.split(" ").filter((i) => !el.classList.contains(i)).filter(Boolean);
    let addClassesAndReturnUndo = (classes) => {
      el.classList.add(...classes);
      return () => {
        el.classList.remove(...classes);
      };
    };
    classString = classString === true ? classString = "" : classString || "";
    return addClassesAndReturnUndo(missingClasses(classString));
  }
  function setClassesFromObject(el, classObject) {
    let split = (classString) => classString.split(" ").filter(Boolean);
    let forAdd = Object.entries(classObject).flatMap(([classString, bool]) => bool ? split(classString) : false).filter(Boolean);
    let forRemove = Object.entries(classObject).flatMap(([classString, bool]) => !bool ? split(classString) : false).filter(Boolean);
    let added = [];
    let removed = [];
    forRemove.forEach((i) => {
      if (el.classList.contains(i)) {
        el.classList.remove(i);
        removed.push(i);
      }
    });
    forAdd.forEach((i) => {
      if (!el.classList.contains(i)) {
        el.classList.add(i);
        added.push(i);
      }
    });
    return () => {
      removed.forEach((i) => el.classList.add(i));
      added.forEach((i) => el.classList.remove(i));
    };
  }
  function setStyles(el, value) {
    if (typeof value === "object" && value !== null) {
      return setStylesFromObject(el, value);
    }
    return setStylesFromString(el, value);
  }
  function setStylesFromObject(el, value) {
    let previousStyles = {};
    Object.entries(value).forEach(([key, value2]) => {
      previousStyles[key] = el.style[key];
      if (!key.startsWith("--")) {
        key = kebabCase(key);
      }
      el.style.setProperty(key, value2);
    });
    setTimeout(() => {
      if (el.style.length === 0) {
        el.removeAttribute("style");
      }
    });
    return () => {
      setStyles(el, previousStyles);
    };
  }
  function setStylesFromString(el, value) {
    let cache = el.getAttribute("style", value);
    el.setAttribute("style", value);
    return () => {
      el.setAttribute("style", cache || "");
    };
  }
  function kebabCase(subject) {
    return subject.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  function once(callback, fallback = () => {
  }) {
    let called = false;
    return function() {
      if (!called) {
        called = true;
        callback.apply(this, arguments);
      } else {
        fallback.apply(this, arguments);
      }
    };
  }
  directive("transition", (el, { value, modifiers, expression }, { evaluate: evaluate2 }) => {
    if (typeof expression === "function")
      expression = evaluate2(expression);
    if (expression === false)
      return;
    if (!expression || typeof expression === "boolean") {
      registerTransitionsFromHelper(el, modifiers, value);
    } else {
      registerTransitionsFromClassString(el, expression, value);
    }
  });
  function registerTransitionsFromClassString(el, classString, stage) {
    registerTransitionObject(el, setClasses, "");
    let directiveStorageMap = {
      "enter": (classes) => {
        el._x_transition.enter.during = classes;
      },
      "enter-start": (classes) => {
        el._x_transition.enter.start = classes;
      },
      "enter-end": (classes) => {
        el._x_transition.enter.end = classes;
      },
      "leave": (classes) => {
        el._x_transition.leave.during = classes;
      },
      "leave-start": (classes) => {
        el._x_transition.leave.start = classes;
      },
      "leave-end": (classes) => {
        el._x_transition.leave.end = classes;
      }
    };
    directiveStorageMap[stage](classString);
  }
  function registerTransitionsFromHelper(el, modifiers, stage) {
    registerTransitionObject(el, setStyles);
    let doesntSpecify = !modifiers.includes("in") && !modifiers.includes("out") && !stage;
    let transitioningIn = doesntSpecify || modifiers.includes("in") || ["enter"].includes(stage);
    let transitioningOut = doesntSpecify || modifiers.includes("out") || ["leave"].includes(stage);
    if (modifiers.includes("in") && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) => index < modifiers.indexOf("out"));
    }
    if (modifiers.includes("out") && !doesntSpecify) {
      modifiers = modifiers.filter((i, index) => index > modifiers.indexOf("out"));
    }
    let wantsAll = !modifiers.includes("opacity") && !modifiers.includes("scale");
    let wantsOpacity = wantsAll || modifiers.includes("opacity");
    let wantsScale = wantsAll || modifiers.includes("scale");
    let opacityValue = wantsOpacity ? 0 : 1;
    let scaleValue = wantsScale ? modifierValue(modifiers, "scale", 95) / 100 : 1;
    let delay = modifierValue(modifiers, "delay", 0) / 1e3;
    let origin = modifierValue(modifiers, "origin", "center");
    let property = "opacity, transform";
    let durationIn = modifierValue(modifiers, "duration", 150) / 1e3;
    let durationOut = modifierValue(modifiers, "duration", 75) / 1e3;
    let easing = `cubic-bezier(0.4, 0.0, 0.2, 1)`;
    if (transitioningIn) {
      el._x_transition.enter.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationIn}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.enter.start = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
      el._x_transition.enter.end = {
        opacity: 1,
        transform: `scale(1)`
      };
    }
    if (transitioningOut) {
      el._x_transition.leave.during = {
        transformOrigin: origin,
        transitionDelay: `${delay}s`,
        transitionProperty: property,
        transitionDuration: `${durationOut}s`,
        transitionTimingFunction: easing
      };
      el._x_transition.leave.start = {
        opacity: 1,
        transform: `scale(1)`
      };
      el._x_transition.leave.end = {
        opacity: opacityValue,
        transform: `scale(${scaleValue})`
      };
    }
  }
  function registerTransitionObject(el, setFunction, defaultValue = {}) {
    if (!el._x_transition)
      el._x_transition = {
        enter: { during: defaultValue, start: defaultValue, end: defaultValue },
        leave: { during: defaultValue, start: defaultValue, end: defaultValue },
        in(before = () => {
        }, after = () => {
        }) {
          transition(el, setFunction, {
            during: this.enter.during,
            start: this.enter.start,
            end: this.enter.end
          }, before, after);
        },
        out(before = () => {
        }, after = () => {
        }) {
          transition(el, setFunction, {
            during: this.leave.during,
            start: this.leave.start,
            end: this.leave.end
          }, before, after);
        }
      };
  }
  window.Element.prototype._x_toggleAndCascadeWithTransitions = function(el, value, show, hide) {
    const nextTick2 = document.visibilityState === "visible" ? requestAnimationFrame : setTimeout;
    let clickAwayCompatibleShow = () => nextTick2(show);
    if (value) {
      if (el._x_transition && (el._x_transition.enter || el._x_transition.leave)) {
        el._x_transition.enter && (Object.entries(el._x_transition.enter.during).length || Object.entries(el._x_transition.enter.start).length || Object.entries(el._x_transition.enter.end).length) ? el._x_transition.in(show) : clickAwayCompatibleShow();
      } else {
        el._x_transition ? el._x_transition.in(show) : clickAwayCompatibleShow();
      }
      return;
    }
    el._x_hidePromise = el._x_transition ? new Promise((resolve, reject) => {
      el._x_transition.out(() => {
      }, () => resolve(hide));
      el._x_transitioning && el._x_transitioning.beforeCancel(() => reject({ isFromCancelledTransition: true }));
    }) : Promise.resolve(hide);
    queueMicrotask(() => {
      let closest = closestHide(el);
      if (closest) {
        if (!closest._x_hideChildren)
          closest._x_hideChildren = [];
        closest._x_hideChildren.push(el);
      } else {
        nextTick2(() => {
          let hideAfterChildren = (el2) => {
            let carry = Promise.all([
              el2._x_hidePromise,
              ...(el2._x_hideChildren || []).map(hideAfterChildren)
            ]).then(([i]) => i?.());
            delete el2._x_hidePromise;
            delete el2._x_hideChildren;
            return carry;
          };
          hideAfterChildren(el).catch((e) => {
            if (!e.isFromCancelledTransition)
              throw e;
          });
        });
      }
    });
  };
  function closestHide(el) {
    let parent = el.parentNode;
    if (!parent)
      return;
    return parent._x_hidePromise ? parent : closestHide(parent);
  }
  function transition(el, setFunction, { during, start: start2, end } = {}, before = () => {
  }, after = () => {
  }) {
    if (el._x_transitioning)
      el._x_transitioning.cancel();
    if (Object.keys(during).length === 0 && Object.keys(start2).length === 0 && Object.keys(end).length === 0) {
      before();
      after();
      return;
    }
    let undoStart, undoDuring, undoEnd;
    performTransition(el, {
      start() {
        undoStart = setFunction(el, start2);
      },
      during() {
        undoDuring = setFunction(el, during);
      },
      before,
      end() {
        undoStart();
        undoEnd = setFunction(el, end);
      },
      after,
      cleanup() {
        undoDuring();
        undoEnd();
      }
    });
  }
  function performTransition(el, stages) {
    let interrupted, reachedBefore, reachedEnd;
    let finish = once(() => {
      mutateDom(() => {
        interrupted = true;
        if (!reachedBefore)
          stages.before();
        if (!reachedEnd) {
          stages.end();
          releaseNextTicks();
        }
        stages.after();
        if (el.isConnected)
          stages.cleanup();
        delete el._x_transitioning;
      });
    });
    el._x_transitioning = {
      beforeCancels: [],
      beforeCancel(callback) {
        this.beforeCancels.push(callback);
      },
      cancel: once(function() {
        while (this.beforeCancels.length) {
          this.beforeCancels.shift()();
        }
        ;
        finish();
      }),
      finish
    };
    mutateDom(() => {
      stages.start();
      stages.during();
    });
    holdNextTicks();
    requestAnimationFrame(() => {
      if (interrupted)
        return;
      let duration = Number(getComputedStyle(el).transitionDuration.replace(/,.*/, "").replace("s", "")) * 1e3;
      let delay = Number(getComputedStyle(el).transitionDelay.replace(/,.*/, "").replace("s", "")) * 1e3;
      if (duration === 0)
        duration = Number(getComputedStyle(el).animationDuration.replace("s", "")) * 1e3;
      mutateDom(() => {
        stages.before();
      });
      reachedBefore = true;
      requestAnimationFrame(() => {
        if (interrupted)
          return;
        mutateDom(() => {
          stages.end();
        });
        releaseNextTicks();
        setTimeout(el._x_transitioning.finish, duration + delay);
        reachedEnd = true;
      });
    });
  }
  function modifierValue(modifiers, key, fallback) {
    if (modifiers.indexOf(key) === -1)
      return fallback;
    const rawValue = modifiers[modifiers.indexOf(key) + 1];
    if (!rawValue)
      return fallback;
    if (key === "scale") {
      if (isNaN(rawValue))
        return fallback;
    }
    if (key === "duration" || key === "delay") {
      let match = rawValue.match(/([0-9]+)ms/);
      if (match)
        return match[1];
    }
    if (key === "origin") {
      if (["top", "right", "left", "center", "bottom"].includes(modifiers[modifiers.indexOf(key) + 2])) {
        return [rawValue, modifiers[modifiers.indexOf(key) + 2]].join(" ");
      }
    }
    return rawValue;
  }
  var isCloning = false;
  function skipDuringClone(callback, fallback = () => {
  }) {
    return (...args) => isCloning ? fallback(...args) : callback(...args);
  }
  function onlyDuringClone(callback) {
    return (...args) => isCloning && callback(...args);
  }
  var interceptors = [];
  function interceptClone(callback) {
    interceptors.push(callback);
  }
  function cloneNode(from, to) {
    interceptors.forEach((i) => i(from, to));
    isCloning = true;
    dontRegisterReactiveSideEffects(() => {
      initTree(to, (el, callback) => {
        callback(el, () => {
        });
      });
    });
    isCloning = false;
  }
  var isCloningLegacy = false;
  function clone(oldEl, newEl) {
    if (!newEl._x_dataStack)
      newEl._x_dataStack = oldEl._x_dataStack;
    isCloning = true;
    isCloningLegacy = true;
    dontRegisterReactiveSideEffects(() => {
      cloneTree(newEl);
    });
    isCloning = false;
    isCloningLegacy = false;
  }
  function cloneTree(el) {
    let hasRunThroughFirstEl = false;
    let shallowWalker = (el2, callback) => {
      walk(el2, (el3, skip) => {
        if (hasRunThroughFirstEl && isRoot(el3))
          return skip();
        hasRunThroughFirstEl = true;
        callback(el3, skip);
      });
    };
    initTree(el, shallowWalker);
  }
  function dontRegisterReactiveSideEffects(callback) {
    let cache = effect;
    overrideEffect((callback2, el) => {
      let storedEffect = cache(callback2);
      release(storedEffect);
      return () => {
      };
    });
    callback();
    overrideEffect(cache);
  }
  function bind(el, name, value, modifiers = []) {
    if (!el._x_bindings)
      el._x_bindings = reactive({});
    el._x_bindings[name] = value;
    name = modifiers.includes("camel") ? camelCase(name) : name;
    switch (name) {
      case "value":
        bindInputValue(el, value);
        break;
      case "style":
        bindStyles(el, value);
        break;
      case "class":
        bindClasses(el, value);
        break;
      case "selected":
      case "checked":
        bindAttributeAndProperty(el, name, value);
        break;
      default:
        bindAttribute(el, name, value);
        break;
    }
  }
  function bindInputValue(el, value) {
    if (el.type === "radio") {
      if (el.attributes.value === void 0) {
        el.value = value;
      }
      if (window.fromModel) {
        if (typeof value === "boolean") {
          el.checked = safeParseBoolean(el.value) === value;
        } else {
          el.checked = checkedAttrLooseCompare(el.value, value);
        }
      }
    } else if (el.type === "checkbox") {
      if (Number.isInteger(value)) {
        el.value = value;
      } else if (!Array.isArray(value) && typeof value !== "boolean" && ![null, void 0].includes(value)) {
        el.value = String(value);
      } else {
        if (Array.isArray(value)) {
          el.checked = value.some((val) => checkedAttrLooseCompare(val, el.value));
        } else {
          el.checked = !!value;
        }
      }
    } else if (el.tagName === "SELECT") {
      updateSelect(el, value);
    } else {
      if (el.value === value)
        return;
      el.value = value === void 0 ? "" : value;
    }
  }
  function bindClasses(el, value) {
    if (el._x_undoAddedClasses)
      el._x_undoAddedClasses();
    el._x_undoAddedClasses = setClasses(el, value);
  }
  function bindStyles(el, value) {
    if (el._x_undoAddedStyles)
      el._x_undoAddedStyles();
    el._x_undoAddedStyles = setStyles(el, value);
  }
  function bindAttributeAndProperty(el, name, value) {
    bindAttribute(el, name, value);
    setPropertyIfChanged(el, name, value);
  }
  function bindAttribute(el, name, value) {
    if ([null, void 0, false].includes(value) && attributeShouldntBePreservedIfFalsy(name)) {
      el.removeAttribute(name);
    } else {
      if (isBooleanAttr(name))
        value = name;
      setIfChanged(el, name, value);
    }
  }
  function setIfChanged(el, attrName, value) {
    if (el.getAttribute(attrName) != value) {
      el.setAttribute(attrName, value);
    }
  }
  function setPropertyIfChanged(el, propName, value) {
    if (el[propName] !== value) {
      el[propName] = value;
    }
  }
  function updateSelect(el, value) {
    const arrayWrappedValue = [].concat(value).map((value2) => {
      return value2 + "";
    });
    Array.from(el.options).forEach((option) => {
      option.selected = arrayWrappedValue.includes(option.value);
    });
  }
  function camelCase(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
  }
  function checkedAttrLooseCompare(valueA, valueB) {
    return valueA == valueB;
  }
  function safeParseBoolean(rawValue) {
    if ([1, "1", "true", "on", "yes", true].includes(rawValue)) {
      return true;
    }
    if ([0, "0", "false", "off", "no", false].includes(rawValue)) {
      return false;
    }
    return rawValue ? Boolean(rawValue) : null;
  }
  function isBooleanAttr(attrName) {
    const booleanAttributes = [
      "disabled",
      "checked",
      "required",
      "readonly",
      "open",
      "selected",
      "autofocus",
      "itemscope",
      "multiple",
      "novalidate",
      "allowfullscreen",
      "allowpaymentrequest",
      "formnovalidate",
      "autoplay",
      "controls",
      "loop",
      "muted",
      "playsinline",
      "default",
      "ismap",
      "reversed",
      "async",
      "defer",
      "nomodule"
    ];
    return booleanAttributes.includes(attrName);
  }
  function attributeShouldntBePreservedIfFalsy(name) {
    return !["aria-pressed", "aria-checked", "aria-expanded", "aria-selected"].includes(name);
  }
  function getBinding(el, name, fallback) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    return getAttributeBinding(el, name, fallback);
  }
  function extractProp(el, name, fallback, extract = true) {
    if (el._x_bindings && el._x_bindings[name] !== void 0)
      return el._x_bindings[name];
    if (el._x_inlineBindings && el._x_inlineBindings[name] !== void 0) {
      let binding = el._x_inlineBindings[name];
      binding.extract = extract;
      return dontAutoEvaluateFunctions(() => {
        return evaluate(el, binding.expression);
      });
    }
    return getAttributeBinding(el, name, fallback);
  }
  function getAttributeBinding(el, name, fallback) {
    let attr = el.getAttribute(name);
    if (attr === null)
      return typeof fallback === "function" ? fallback() : fallback;
    if (attr === "")
      return true;
    if (isBooleanAttr(name)) {
      return !![name, "true"].includes(attr);
    }
    return attr;
  }
  function debounce(func, wait) {
    var timeout;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      let context = this, args = arguments;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  function entangle({ get: outerGet, set: outerSet }, { get: innerGet, set: innerSet }) {
    let firstRun = true;
    let outerHash;
    let innerHash;
    let reference = effect(() => {
      let outer = outerGet();
      let inner = innerGet();
      if (firstRun) {
        innerSet(cloneIfObject(outer));
        firstRun = false;
      } else {
        let outerHashLatest = JSON.stringify(outer);
        let innerHashLatest = JSON.stringify(inner);
        if (outerHashLatest !== outerHash) {
          innerSet(cloneIfObject(outer));
        } else if (outerHashLatest !== innerHashLatest) {
          outerSet(cloneIfObject(inner));
        } else {
        }
      }
      outerHash = JSON.stringify(outerGet());
      innerHash = JSON.stringify(innerGet());
    });
    return () => {
      release(reference);
    };
  }
  function cloneIfObject(value) {
    return typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  }
  function plugin(callback) {
    let callbacks = Array.isArray(callback) ? callback : [callback];
    callbacks.forEach((i) => i(alpine_default));
  }
  var stores = {};
  var isReactive = false;
  function store(name, value) {
    if (!isReactive) {
      stores = reactive(stores);
      isReactive = true;
    }
    if (value === void 0) {
      return stores[name];
    }
    stores[name] = value;
    if (typeof value === "object" && value !== null && value.hasOwnProperty("init") && typeof value.init === "function") {
      stores[name].init();
    }
    initInterceptors(stores[name]);
  }
  function getStores() {
    return stores;
  }
  var binds = {};
  function bind2(name, bindings) {
    let getBindings = typeof bindings !== "function" ? () => bindings : bindings;
    if (name instanceof Element) {
      return applyBindingsObject(name, getBindings());
    } else {
      binds[name] = getBindings;
    }
    return () => {
    };
  }
  function injectBindingProviders(obj) {
    Object.entries(binds).forEach(([name, callback]) => {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) => {
            return callback(...args);
          };
        }
      });
    });
    return obj;
  }
  function applyBindingsObject(el, obj, original) {
    let cleanupRunners = [];
    while (cleanupRunners.length)
      cleanupRunners.pop()();
    let attributes = Object.entries(obj).map(([name, value]) => ({ name, value }));
    let staticAttributes = attributesOnly(attributes);
    attributes = attributes.map((attribute) => {
      if (staticAttributes.find((attr) => attr.name === attribute.name)) {
        return {
          name: `x-bind:${attribute.name}`,
          value: `"${attribute.value}"`
        };
      }
      return attribute;
    });
    directives(el, attributes, original).map((handle) => {
      cleanupRunners.push(handle.runCleanups);
      handle();
    });
    return () => {
      while (cleanupRunners.length)
        cleanupRunners.pop()();
    };
  }
  var datas = {};
  function data(name, callback) {
    datas[name] = callback;
  }
  function injectDataProviders(obj, context) {
    Object.entries(datas).forEach(([name, callback]) => {
      Object.defineProperty(obj, name, {
        get() {
          return (...args) => {
            return callback.bind(context)(...args);
          };
        },
        enumerable: false
      });
    });
    return obj;
  }
  var Alpine = {
    get reactive() {
      return reactive;
    },
    get release() {
      return release;
    },
    get effect() {
      return effect;
    },
    get raw() {
      return raw;
    },
    version: "3.14.1",
    flushAndStopDeferringMutations,
    dontAutoEvaluateFunctions,
    disableEffectScheduling,
    startObservingMutations,
    stopObservingMutations,
    setReactivityEngine,
    onAttributeRemoved,
    onAttributesAdded,
    closestDataStack,
    skipDuringClone,
    onlyDuringClone,
    addRootSelector,
    addInitSelector,
    interceptClone,
    addScopeToNode,
    deferMutations,
    mapAttributes,
    evaluateLater,
    interceptInit,
    setEvaluator,
    mergeProxies,
    extractProp,
    findClosest,
    onElRemoved,
    closestRoot,
    destroyTree,
    interceptor,
    // INTERNAL: not public API and is subject to change without major release.
    transition,
    // INTERNAL
    setStyles,
    // INTERNAL
    mutateDom,
    directive,
    entangle,
    throttle,
    debounce,
    evaluate,
    initTree,
    nextTick,
    prefixed: prefix,
    prefix: setPrefix,
    plugin,
    magic,
    store,
    start,
    clone,
    // INTERNAL
    cloneNode,
    // INTERNAL
    bound: getBinding,
    $data: scope,
    watch,
    walk,
    data,
    bind: bind2
  };
  var alpine_default = Alpine;
  function makeMap(str, expectsLowerCase) {
    const map = /* @__PURE__ */ Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase ? (val) => !!map[val.toLowerCase()] : (val) => !!map[val];
  }
  var specialBooleanAttrs = `itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly`;
  var isBooleanAttr2 = /* @__PURE__ */ makeMap(specialBooleanAttrs + `,async,autofocus,autoplay,controls,default,defer,disabled,hidden,loop,open,required,reversed,scoped,seamless,checked,muted,multiple,selected`);
  var EMPTY_OBJ = true ? Object.freeze({}) : {};
  var EMPTY_ARR = true ? Object.freeze([]) : [];
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var hasOwn = (val, key) => hasOwnProperty.call(val, key);
  var isArray = Array.isArray;
  var isMap = (val) => toTypeString(val) === "[object Map]";
  var isString = (val) => typeof val === "string";
  var isSymbol = (val) => typeof val === "symbol";
  var isObject = (val) => val !== null && typeof val === "object";
  var objectToString = Object.prototype.toString;
  var toTypeString = (value) => objectToString.call(value);
  var toRawType = (value) => {
    return toTypeString(value).slice(8, -1);
  };
  var isIntegerKey = (key) => isString(key) && key !== "NaN" && key[0] !== "-" && "" + parseInt(key, 10) === key;
  var cacheStringFunction = (fn) => {
    const cache = /* @__PURE__ */ Object.create(null);
    return (str) => {
      const hit = cache[str];
      return hit || (cache[str] = fn(str));
    };
  };
  var camelizeRE = /-(\w)/g;
  var camelize = cacheStringFunction((str) => {
    return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
  });
  var hyphenateRE = /\B([A-Z])/g;
  var hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, "-$1").toLowerCase());
  var capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
  var toHandlerKey = cacheStringFunction((str) => str ? `on${capitalize(str)}` : ``);
  var hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
  var targetMap = /* @__PURE__ */ new WeakMap();
  var effectStack = [];
  var activeEffect;
  var ITERATE_KEY = Symbol(true ? "iterate" : "");
  var MAP_KEY_ITERATE_KEY = Symbol(true ? "Map key iterate" : "");
  function isEffect(fn) {
    return fn && fn._isEffect === true;
  }
  function effect2(fn, options = EMPTY_OBJ) {
    if (isEffect(fn)) {
      fn = fn.raw;
    }
    const effect3 = createReactiveEffect(fn, options);
    if (!options.lazy) {
      effect3();
    }
    return effect3;
  }
  function stop(effect3) {
    if (effect3.active) {
      cleanup(effect3);
      if (effect3.options.onStop) {
        effect3.options.onStop();
      }
      effect3.active = false;
    }
  }
  var uid = 0;
  function createReactiveEffect(fn, options) {
    const effect3 = function reactiveEffect() {
      if (!effect3.active) {
        return fn();
      }
      if (!effectStack.includes(effect3)) {
        cleanup(effect3);
        try {
          enableTracking();
          effectStack.push(effect3);
          activeEffect = effect3;
          return fn();
        } finally {
          effectStack.pop();
          resetTracking();
          activeEffect = effectStack[effectStack.length - 1];
        }
      }
    };
    effect3.id = uid++;
    effect3.allowRecurse = !!options.allowRecurse;
    effect3._isEffect = true;
    effect3.active = true;
    effect3.raw = fn;
    effect3.deps = [];
    effect3.options = options;
    return effect3;
  }
  function cleanup(effect3) {
    const { deps } = effect3;
    if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
        deps[i].delete(effect3);
      }
      deps.length = 0;
    }
  }
  var shouldTrack = true;
  var trackStack = [];
  function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
  }
  function enableTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = true;
  }
  function resetTracking() {
    const last = trackStack.pop();
    shouldTrack = last === void 0 ? true : last;
  }
  function track(target, type, key) {
    if (!shouldTrack || activeEffect === void 0) {
      return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = /* @__PURE__ */ new Set());
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);
      if (activeEffect.options.onTrack) {
        activeEffect.options.onTrack({
          effect: activeEffect,
          target,
          type,
          key
        });
      }
    }
  }
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
    const depsMap = targetMap.get(target);
    if (!depsMap) {
      return;
    }
    const effects = /* @__PURE__ */ new Set();
    const add2 = (effectsToAdd) => {
      if (effectsToAdd) {
        effectsToAdd.forEach((effect3) => {
          if (effect3 !== activeEffect || effect3.allowRecurse) {
            effects.add(effect3);
          }
        });
      }
    };
    if (type === "clear") {
      depsMap.forEach(add2);
    } else if (key === "length" && isArray(target)) {
      depsMap.forEach((dep, key2) => {
        if (key2 === "length" || key2 >= newValue) {
          add2(dep);
        }
      });
    } else {
      if (key !== void 0) {
        add2(depsMap.get(key));
      }
      switch (type) {
        case "add":
          if (!isArray(target)) {
            add2(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              add2(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          } else if (isIntegerKey(key)) {
            add2(depsMap.get("length"));
          }
          break;
        case "delete":
          if (!isArray(target)) {
            add2(depsMap.get(ITERATE_KEY));
            if (isMap(target)) {
              add2(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          }
          break;
        case "set":
          if (isMap(target)) {
            add2(depsMap.get(ITERATE_KEY));
          }
          break;
      }
    }
    const run = (effect3) => {
      if (effect3.options.onTrigger) {
        effect3.options.onTrigger({
          effect: effect3,
          target,
          key,
          type,
          newValue,
          oldValue,
          oldTarget
        });
      }
      if (effect3.options.scheduler) {
        effect3.options.scheduler(effect3);
      } else {
        effect3();
      }
    };
    effects.forEach(run);
  }
  var isNonTrackableKeys = /* @__PURE__ */ makeMap(`__proto__,__v_isRef,__isVue`);
  var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map((key) => Symbol[key]).filter(isSymbol));
  var get2 = /* @__PURE__ */ createGetter();
  var readonlyGet = /* @__PURE__ */ createGetter(true);
  var arrayInstrumentations = /* @__PURE__ */ createArrayInstrumentations();
  function createArrayInstrumentations() {
    const instrumentations = {};
    ["includes", "indexOf", "lastIndexOf"].forEach((key) => {
      instrumentations[key] = function(...args) {
        const arr = toRaw(this);
        for (let i = 0, l = this.length; i < l; i++) {
          track(arr, "get", i + "");
        }
        const res = arr[key](...args);
        if (res === -1 || res === false) {
          return arr[key](...args.map(toRaw));
        } else {
          return res;
        }
      };
    });
    ["push", "pop", "shift", "unshift", "splice"].forEach((key) => {
      instrumentations[key] = function(...args) {
        pauseTracking();
        const res = toRaw(this)[key].apply(this, args);
        resetTracking();
        return res;
      };
    });
    return instrumentations;
  }
  function createGetter(isReadonly = false, shallow = false) {
    return function get3(target, key, receiver) {
      if (key === "__v_isReactive") {
        return !isReadonly;
      } else if (key === "__v_isReadonly") {
        return isReadonly;
      } else if (key === "__v_raw" && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
        return target;
      }
      const targetIsArray = isArray(target);
      if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }
      const res = Reflect.get(target, key, receiver);
      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
        return res;
      }
      if (!isReadonly) {
        track(target, "get", key);
      }
      if (shallow) {
        return res;
      }
      if (isRef(res)) {
        const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
        return shouldUnwrap ? res.value : res;
      }
      if (isObject(res)) {
        return isReadonly ? readonly(res) : reactive2(res);
      }
      return res;
    };
  }
  var set2 = /* @__PURE__ */ createSetter();
  function createSetter(shallow = false) {
    return function set3(target, key, value, receiver) {
      let oldValue = target[key];
      if (!shallow) {
        value = toRaw(value);
        oldValue = toRaw(oldValue);
        if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
        }
      }
      const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
      const result = Reflect.set(target, key, value, receiver);
      if (target === toRaw(receiver)) {
        if (!hadKey) {
          trigger(target, "add", key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set", key, value, oldValue);
        }
      }
      return result;
    };
  }
  function deleteProperty(target, key) {
    const hadKey = hasOwn(target, key);
    const oldValue = target[key];
    const result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
      trigger(target, "delete", key, void 0, oldValue);
    }
    return result;
  }
  function has(target, key) {
    const result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, "has", key);
    }
    return result;
  }
  function ownKeys(target) {
    track(target, "iterate", isArray(target) ? "length" : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }
  var mutableHandlers = {
    get: get2,
    set: set2,
    deleteProperty,
    has,
    ownKeys
  };
  var readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
      if (true) {
        console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
      }
      return true;
    },
    deleteProperty(target, key) {
      if (true) {
        console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
      }
      return true;
    }
  };
  var toReactive = (value) => isObject(value) ? reactive2(value) : value;
  var toReadonly = (value) => isObject(value) ? readonly(value) : value;
  var toShallow = (value) => value;
  var getProto = (v) => Reflect.getPrototypeOf(v);
  function get$1(target, key, isReadonly = false, isShallow = false) {
    target = target[
      "__v_raw"
      /* RAW */
    ];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "get", key);
    }
    !isReadonly && track(rawTarget, "get", rawKey);
    const { has: has2 } = getProto(rawTarget);
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (has2.call(rawTarget, key)) {
      return wrap(target.get(key));
    } else if (has2.call(rawTarget, rawKey)) {
      return wrap(target.get(rawKey));
    } else if (target !== rawTarget) {
      target.get(key);
    }
  }
  function has$1(key, isReadonly = false) {
    const target = this[
      "__v_raw"
      /* RAW */
    ];
    const rawTarget = toRaw(target);
    const rawKey = toRaw(key);
    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "has", key);
    }
    !isReadonly && track(rawTarget, "has", rawKey);
    return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
  }
  function size(target, isReadonly = false) {
    target = target[
      "__v_raw"
      /* RAW */
    ];
    !isReadonly && track(toRaw(target), "iterate", ITERATE_KEY);
    return Reflect.get(target, "size", target);
  }
  function add(value) {
    value = toRaw(value);
    const target = toRaw(this);
    const proto = getProto(target);
    const hadKey = proto.has.call(target, value);
    if (!hadKey) {
      target.add(value);
      trigger(target, "add", value, value);
    }
    return this;
  }
  function set$1(key, value) {
    value = toRaw(value);
    const target = toRaw(this);
    const { has: has2, get: get3 } = getProto(target);
    let hadKey = has2.call(target, key);
    if (!hadKey) {
      key = toRaw(key);
      hadKey = has2.call(target, key);
    } else if (true) {
      checkIdentityKeys(target, has2, key);
    }
    const oldValue = get3.call(target, key);
    target.set(key, value);
    if (!hadKey) {
      trigger(target, "add", key, value);
    } else if (hasChanged(value, oldValue)) {
      trigger(target, "set", key, value, oldValue);
    }
    return this;
  }
  function deleteEntry(key) {
    const target = toRaw(this);
    const { has: has2, get: get3 } = getProto(target);
    let hadKey = has2.call(target, key);
    if (!hadKey) {
      key = toRaw(key);
      hadKey = has2.call(target, key);
    } else if (true) {
      checkIdentityKeys(target, has2, key);
    }
    const oldValue = get3 ? get3.call(target, key) : void 0;
    const result = target.delete(key);
    if (hadKey) {
      trigger(target, "delete", key, void 0, oldValue);
    }
    return result;
  }
  function clear() {
    const target = toRaw(this);
    const hadItems = target.size !== 0;
    const oldTarget = true ? isMap(target) ? new Map(target) : new Set(target) : void 0;
    const result = target.clear();
    if (hadItems) {
      trigger(target, "clear", void 0, void 0, oldTarget);
    }
    return result;
  }
  function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
      const observed = this;
      const target = observed[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate", ITERATE_KEY);
      return target.forEach((value, key) => {
        return callback.call(thisArg, wrap(value), wrap(key), observed);
      });
    };
  }
  function createIterableMethod(method, isReadonly, isShallow) {
    return function(...args) {
      const target = this[
        "__v_raw"
        /* RAW */
      ];
      const rawTarget = toRaw(target);
      const targetIsMap = isMap(rawTarget);
      const isPair = method === "entries" || method === Symbol.iterator && targetIsMap;
      const isKeyOnly = method === "keys" && targetIsMap;
      const innerIterator = target[method](...args);
      const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate", isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
      return {
        // iterator protocol
        next() {
          const { value, done } = innerIterator.next();
          return done ? { value, done } : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done
          };
        },
        // iterable protocol
        [Symbol.iterator]() {
          return this;
        }
      };
    };
  }
  function createReadonlyMethod(type) {
    return function(...args) {
      if (true) {
        const key = args[0] ? `on key "${args[0]}" ` : ``;
        console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
      }
      return type === "delete" ? false : this;
    };
  }
  function createInstrumentations() {
    const mutableInstrumentations2 = {
      get(key) {
        return get$1(this, key);
      },
      get size() {
        return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, false)
    };
    const shallowInstrumentations2 = {
      get(key) {
        return get$1(this, key, false, true);
      },
      get size() {
        return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, true)
    };
    const readonlyInstrumentations2 = {
      get(key) {
        return get$1(this, key, true);
      },
      get size() {
        return size(this, true);
      },
      has(key) {
        return has$1.call(this, key, true);
      },
      add: createReadonlyMethod(
        "add"
        /* ADD */
      ),
      set: createReadonlyMethod(
        "set"
        /* SET */
      ),
      delete: createReadonlyMethod(
        "delete"
        /* DELETE */
      ),
      clear: createReadonlyMethod(
        "clear"
        /* CLEAR */
      ),
      forEach: createForEach(true, false)
    };
    const shallowReadonlyInstrumentations2 = {
      get(key) {
        return get$1(this, key, true, true);
      },
      get size() {
        return size(this, true);
      },
      has(key) {
        return has$1.call(this, key, true);
      },
      add: createReadonlyMethod(
        "add"
        /* ADD */
      ),
      set: createReadonlyMethod(
        "set"
        /* SET */
      ),
      delete: createReadonlyMethod(
        "delete"
        /* DELETE */
      ),
      clear: createReadonlyMethod(
        "clear"
        /* CLEAR */
      ),
      forEach: createForEach(true, true)
    };
    const iteratorMethods = ["keys", "values", "entries", Symbol.iterator];
    iteratorMethods.forEach((method) => {
      mutableInstrumentations2[method] = createIterableMethod(method, false, false);
      readonlyInstrumentations2[method] = createIterableMethod(method, true, false);
      shallowInstrumentations2[method] = createIterableMethod(method, false, true);
      shallowReadonlyInstrumentations2[method] = createIterableMethod(method, true, true);
    });
    return [
      mutableInstrumentations2,
      readonlyInstrumentations2,
      shallowInstrumentations2,
      shallowReadonlyInstrumentations2
    ];
  }
  var [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* @__PURE__ */ createInstrumentations();
  function createInstrumentationGetter(isReadonly, shallow) {
    const instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
    return (target, key, receiver) => {
      if (key === "__v_isReactive") {
        return !isReadonly;
      } else if (key === "__v_isReadonly") {
        return isReadonly;
      } else if (key === "__v_raw") {
        return target;
      }
      return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
    };
  }
  var mutableCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(false, false)
  };
  var readonlyCollectionHandlers = {
    get: /* @__PURE__ */ createInstrumentationGetter(true, false)
  };
  function checkIdentityKeys(target, has2, key) {
    const rawKey = toRaw(key);
    if (rawKey !== key && has2.call(target, rawKey)) {
      const type = toRawType(target);
      console.warn(`Reactive ${type} contains both the raw and reactive versions of the same object${type === `Map` ? ` as keys` : ``}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`);
    }
  }
  var reactiveMap = /* @__PURE__ */ new WeakMap();
  var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
  var readonlyMap = /* @__PURE__ */ new WeakMap();
  var shallowReadonlyMap = /* @__PURE__ */ new WeakMap();
  function targetTypeMap(rawType) {
    switch (rawType) {
      case "Object":
      case "Array":
        return 1;
      case "Map":
      case "Set":
      case "WeakMap":
      case "WeakSet":
        return 2;
      default:
        return 0;
    }
  }
  function getTargetType(value) {
    return value[
      "__v_skip"
      /* SKIP */
    ] || !Object.isExtensible(value) ? 0 : targetTypeMap(toRawType(value));
  }
  function reactive2(target) {
    if (target && target[
      "__v_isReadonly"
      /* IS_READONLY */
    ]) {
      return target;
    }
    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
  }
  function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
  }
  function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject(target)) {
      if (true) {
        console.warn(`value cannot be made reactive: ${String(target)}`);
      }
      return target;
    }
    if (target[
      "__v_raw"
      /* RAW */
    ] && !(isReadonly && target[
      "__v_isReactive"
      /* IS_REACTIVE */
    ])) {
      return target;
    }
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
      return existingProxy;
    }
    const targetType = getTargetType(target);
    if (targetType === 0) {
      return target;
    }
    const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
  }
  function toRaw(observed) {
    return observed && toRaw(observed[
      "__v_raw"
      /* RAW */
    ]) || observed;
  }
  function isRef(r) {
    return Boolean(r && r.__v_isRef === true);
  }
  magic("nextTick", () => nextTick);
  magic("dispatch", (el) => dispatch.bind(dispatch, el));
  magic("watch", (el, { evaluateLater: evaluateLater2, cleanup: cleanup2 }) => (key, callback) => {
    let evaluate2 = evaluateLater2(key);
    let getter = () => {
      let value;
      evaluate2((i) => value = i);
      return value;
    };
    let unwatch = watch(getter, callback);
    cleanup2(unwatch);
  });
  magic("store", getStores);
  magic("data", (el) => scope(el));
  magic("root", (el) => closestRoot(el));
  magic("refs", (el) => {
    if (el._x_refs_proxy)
      return el._x_refs_proxy;
    el._x_refs_proxy = mergeProxies(getArrayOfRefObject(el));
    return el._x_refs_proxy;
  });
  function getArrayOfRefObject(el) {
    let refObjects = [];
    findClosest(el, (i) => {
      if (i._x_refs)
        refObjects.push(i._x_refs);
    });
    return refObjects;
  }
  var globalIdMemo = {};
  function findAndIncrementId(name) {
    if (!globalIdMemo[name])
      globalIdMemo[name] = 0;
    return ++globalIdMemo[name];
  }
  function closestIdRoot(el, name) {
    return findClosest(el, (element) => {
      if (element._x_ids && element._x_ids[name])
        return true;
    });
  }
  function setIdRoot(el, name) {
    if (!el._x_ids)
      el._x_ids = {};
    if (!el._x_ids[name])
      el._x_ids[name] = findAndIncrementId(name);
  }
  magic("id", (el, { cleanup: cleanup2 }) => (name, key = null) => {
    let cacheKey = `${name}${key ? `-${key}` : ""}`;
    return cacheIdByNameOnElement(el, cacheKey, cleanup2, () => {
      let root = closestIdRoot(el, name);
      let id = root ? root._x_ids[name] : findAndIncrementId(name);
      return key ? `${name}-${id}-${key}` : `${name}-${id}`;
    });
  });
  interceptClone((from, to) => {
    if (from._x_id) {
      to._x_id = from._x_id;
    }
  });
  function cacheIdByNameOnElement(el, cacheKey, cleanup2, callback) {
    if (!el._x_id)
      el._x_id = {};
    if (el._x_id[cacheKey])
      return el._x_id[cacheKey];
    let output = callback();
    el._x_id[cacheKey] = output;
    cleanup2(() => {
      delete el._x_id[cacheKey];
    });
    return output;
  }
  magic("el", (el) => el);
  warnMissingPluginMagic("Focus", "focus", "focus");
  warnMissingPluginMagic("Persist", "persist", "persist");
  function warnMissingPluginMagic(name, magicName, slug) {
    magic(magicName, (el) => warn(`You can't use [$${magicName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
  }
  directive("modelable", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2, cleanup: cleanup2 }) => {
    let func = evaluateLater2(expression);
    let innerGet = () => {
      let result;
      func((i) => result = i);
      return result;
    };
    let evaluateInnerSet = evaluateLater2(`${expression} = __placeholder`);
    let innerSet = (val) => evaluateInnerSet(() => {
    }, { scope: { "__placeholder": val } });
    let initialValue = innerGet();
    innerSet(initialValue);
    queueMicrotask(() => {
      if (!el._x_model)
        return;
      el._x_removeModelListeners["default"]();
      let outerGet = el._x_model.get;
      let outerSet = el._x_model.set;
      let releaseEntanglement = entangle(
        {
          get() {
            return outerGet();
          },
          set(value) {
            outerSet(value);
          }
        },
        {
          get() {
            return innerGet();
          },
          set(value) {
            innerSet(value);
          }
        }
      );
      cleanup2(releaseEntanglement);
    });
  });
  directive("teleport", (el, { modifiers, expression }, { cleanup: cleanup2 }) => {
    if (el.tagName.toLowerCase() !== "template")
      warn("x-teleport can only be used on a <template> tag", el);
    let target = getTarget(expression);
    let clone2 = el.content.cloneNode(true).firstElementChild;
    el._x_teleport = clone2;
    clone2._x_teleportBack = el;
    el.setAttribute("data-teleport-template", true);
    clone2.setAttribute("data-teleport-target", true);
    if (el._x_forwardEvents) {
      el._x_forwardEvents.forEach((eventName) => {
        clone2.addEventListener(eventName, (e) => {
          e.stopPropagation();
          el.dispatchEvent(new e.constructor(e.type, e));
        });
      });
    }
    addScopeToNode(clone2, {}, el);
    let placeInDom = (clone3, target2, modifiers2) => {
      if (modifiers2.includes("prepend")) {
        target2.parentNode.insertBefore(clone3, target2);
      } else if (modifiers2.includes("append")) {
        target2.parentNode.insertBefore(clone3, target2.nextSibling);
      } else {
        target2.appendChild(clone3);
      }
    };
    mutateDom(() => {
      placeInDom(clone2, target, modifiers);
      skipDuringClone(() => {
        initTree(clone2);
        clone2._x_ignore = true;
      })();
    });
    el._x_teleportPutBack = () => {
      let target2 = getTarget(expression);
      mutateDom(() => {
        placeInDom(el._x_teleport, target2, modifiers);
      });
    };
    cleanup2(() => clone2.remove());
  });
  var teleportContainerDuringClone = document.createElement("div");
  function getTarget(expression) {
    let target = skipDuringClone(() => {
      return document.querySelector(expression);
    }, () => {
      return teleportContainerDuringClone;
    })();
    if (!target)
      warn(`Cannot find x-teleport element for selector: "${expression}"`);
    return target;
  }
  var handler = () => {
  };
  handler.inline = (el, { modifiers }, { cleanup: cleanup2 }) => {
    modifiers.includes("self") ? el._x_ignoreSelf = true : el._x_ignore = true;
    cleanup2(() => {
      modifiers.includes("self") ? delete el._x_ignoreSelf : delete el._x_ignore;
    });
  };
  directive("ignore", handler);
  directive("effect", skipDuringClone((el, { expression }, { effect: effect3 }) => {
    effect3(evaluateLater(el, expression));
  }));
  function on(el, event, modifiers, callback) {
    let listenerTarget = el;
    let handler4 = (e) => callback(e);
    let options = {};
    let wrapHandler = (callback2, wrapper) => (e) => wrapper(callback2, e);
    if (modifiers.includes("dot"))
      event = dotSyntax(event);
    if (modifiers.includes("camel"))
      event = camelCase2(event);
    if (modifiers.includes("passive"))
      options.passive = true;
    if (modifiers.includes("capture"))
      options.capture = true;
    if (modifiers.includes("window"))
      listenerTarget = window;
    if (modifiers.includes("document"))
      listenerTarget = document;
    if (modifiers.includes("debounce")) {
      let nextModifier = modifiers[modifiers.indexOf("debounce") + 1] || "invalid-wait";
      let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
      handler4 = debounce(handler4, wait);
    }
    if (modifiers.includes("throttle")) {
      let nextModifier = modifiers[modifiers.indexOf("throttle") + 1] || "invalid-wait";
      let wait = isNumeric(nextModifier.split("ms")[0]) ? Number(nextModifier.split("ms")[0]) : 250;
      handler4 = throttle(handler4, wait);
    }
    if (modifiers.includes("prevent"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.preventDefault();
        next(e);
      });
    if (modifiers.includes("stop"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.stopPropagation();
        next(e);
      });
    if (modifiers.includes("once")) {
      handler4 = wrapHandler(handler4, (next, e) => {
        next(e);
        listenerTarget.removeEventListener(event, handler4, options);
      });
    }
    if (modifiers.includes("away") || modifiers.includes("outside")) {
      listenerTarget = document;
      handler4 = wrapHandler(handler4, (next, e) => {
        if (el.contains(e.target))
          return;
        if (e.target.isConnected === false)
          return;
        if (el.offsetWidth < 1 && el.offsetHeight < 1)
          return;
        if (el._x_isShown === false)
          return;
        next(e);
      });
    }
    if (modifiers.includes("self"))
      handler4 = wrapHandler(handler4, (next, e) => {
        e.target === el && next(e);
      });
    if (isKeyEvent(event) || isClickEvent(event)) {
      handler4 = wrapHandler(handler4, (next, e) => {
        if (isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers)) {
          return;
        }
        next(e);
      });
    }
    listenerTarget.addEventListener(event, handler4, options);
    return () => {
      listenerTarget.removeEventListener(event, handler4, options);
    };
  }
  function dotSyntax(subject) {
    return subject.replace(/-/g, ".");
  }
  function camelCase2(subject) {
    return subject.toLowerCase().replace(/-(\w)/g, (match, char) => char.toUpperCase());
  }
  function isNumeric(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }
  function kebabCase2(subject) {
    if ([" ", "_"].includes(
      subject
    ))
      return subject;
    return subject.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/[_\s]/, "-").toLowerCase();
  }
  function isKeyEvent(event) {
    return ["keydown", "keyup"].includes(event);
  }
  function isClickEvent(event) {
    return ["contextmenu", "click", "mouse"].some((i) => event.includes(i));
  }
  function isListeningForASpecificKeyThatHasntBeenPressed(e, modifiers) {
    let keyModifiers = modifiers.filter((i) => {
      return !["window", "document", "prevent", "stop", "once", "capture", "self", "away", "outside", "passive"].includes(i);
    });
    if (keyModifiers.includes("debounce")) {
      let debounceIndex = keyModifiers.indexOf("debounce");
      keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
    }
    if (keyModifiers.includes("throttle")) {
      let debounceIndex = keyModifiers.indexOf("throttle");
      keyModifiers.splice(debounceIndex, isNumeric((keyModifiers[debounceIndex + 1] || "invalid-wait").split("ms")[0]) ? 2 : 1);
    }
    if (keyModifiers.length === 0)
      return false;
    if (keyModifiers.length === 1 && keyToModifiers(e.key).includes(keyModifiers[0]))
      return false;
    const systemKeyModifiers = ["ctrl", "shift", "alt", "meta", "cmd", "super"];
    const selectedSystemKeyModifiers = systemKeyModifiers.filter((modifier) => keyModifiers.includes(modifier));
    keyModifiers = keyModifiers.filter((i) => !selectedSystemKeyModifiers.includes(i));
    if (selectedSystemKeyModifiers.length > 0) {
      const activelyPressedKeyModifiers = selectedSystemKeyModifiers.filter((modifier) => {
        if (modifier === "cmd" || modifier === "super")
          modifier = "meta";
        return e[`${modifier}Key`];
      });
      if (activelyPressedKeyModifiers.length === selectedSystemKeyModifiers.length) {
        if (isClickEvent(e.type))
          return false;
        if (keyToModifiers(e.key).includes(keyModifiers[0]))
          return false;
      }
    }
    return true;
  }
  function keyToModifiers(key) {
    if (!key)
      return [];
    key = kebabCase2(key);
    let modifierToKeyMap = {
      "ctrl": "control",
      "slash": "/",
      "space": " ",
      "spacebar": " ",
      "cmd": "meta",
      "esc": "escape",
      "up": "arrow-up",
      "down": "arrow-down",
      "left": "arrow-left",
      "right": "arrow-right",
      "period": ".",
      "comma": ",",
      "equal": "=",
      "minus": "-",
      "underscore": "_"
    };
    modifierToKeyMap[key] = key;
    return Object.keys(modifierToKeyMap).map((modifier) => {
      if (modifierToKeyMap[modifier] === key)
        return modifier;
    }).filter((modifier) => modifier);
  }
  directive("model", (el, { modifiers, expression }, { effect: effect3, cleanup: cleanup2 }) => {
    let scopeTarget = el;
    if (modifiers.includes("parent")) {
      scopeTarget = el.parentNode;
    }
    let evaluateGet = evaluateLater(scopeTarget, expression);
    let evaluateSet;
    if (typeof expression === "string") {
      evaluateSet = evaluateLater(scopeTarget, `${expression} = __placeholder`);
    } else if (typeof expression === "function" && typeof expression() === "string") {
      evaluateSet = evaluateLater(scopeTarget, `${expression()} = __placeholder`);
    } else {
      evaluateSet = () => {
      };
    }
    let getValue = () => {
      let result;
      evaluateGet((value) => result = value);
      return isGetterSetter(result) ? result.get() : result;
    };
    let setValue = (value) => {
      let result;
      evaluateGet((value2) => result = value2);
      if (isGetterSetter(result)) {
        result.set(value);
      } else {
        evaluateSet(() => {
        }, {
          scope: { "__placeholder": value }
        });
      }
    };
    if (typeof expression === "string" && el.type === "radio") {
      mutateDom(() => {
        if (!el.hasAttribute("name"))
          el.setAttribute("name", expression);
      });
    }
    var event = el.tagName.toLowerCase() === "select" || ["checkbox", "radio"].includes(el.type) || modifiers.includes("lazy") ? "change" : "input";
    let removeListener = isCloning ? () => {
    } : on(el, event, modifiers, (e) => {
      setValue(getInputValue(el, modifiers, e, getValue()));
    });
    if (modifiers.includes("fill")) {
      if ([void 0, null, ""].includes(getValue()) || el.type === "checkbox" && Array.isArray(getValue()) || el.tagName.toLowerCase() === "select" && el.multiple) {
        setValue(
          getInputValue(el, modifiers, { target: el }, getValue())
        );
      }
    }
    if (!el._x_removeModelListeners)
      el._x_removeModelListeners = {};
    el._x_removeModelListeners["default"] = removeListener;
    cleanup2(() => el._x_removeModelListeners["default"]());
    if (el.form) {
      let removeResetListener = on(el.form, "reset", [], (e) => {
        nextTick(() => el._x_model && el._x_model.set(getInputValue(el, modifiers, { target: el }, getValue())));
      });
      cleanup2(() => removeResetListener());
    }
    el._x_model = {
      get() {
        return getValue();
      },
      set(value) {
        setValue(value);
      }
    };
    el._x_forceModelUpdate = (value) => {
      if (value === void 0 && typeof expression === "string" && expression.match(/\./))
        value = "";
      window.fromModel = true;
      mutateDom(() => bind(el, "value", value));
      delete window.fromModel;
    };
    effect3(() => {
      let value = getValue();
      if (modifiers.includes("unintrusive") && document.activeElement.isSameNode(el))
        return;
      el._x_forceModelUpdate(value);
    });
  });
  function getInputValue(el, modifiers, event, currentValue) {
    return mutateDom(() => {
      if (event instanceof CustomEvent && event.detail !== void 0)
        return event.detail !== null && event.detail !== void 0 ? event.detail : event.target.value;
      else if (el.type === "checkbox") {
        if (Array.isArray(currentValue)) {
          let newValue = null;
          if (modifiers.includes("number")) {
            newValue = safeParseNumber(event.target.value);
          } else if (modifiers.includes("boolean")) {
            newValue = safeParseBoolean(event.target.value);
          } else {
            newValue = event.target.value;
          }
          return event.target.checked ? currentValue.includes(newValue) ? currentValue : currentValue.concat([newValue]) : currentValue.filter((el2) => !checkedAttrLooseCompare2(el2, newValue));
        } else {
          return event.target.checked;
        }
      } else if (el.tagName.toLowerCase() === "select" && el.multiple) {
        if (modifiers.includes("number")) {
          return Array.from(event.target.selectedOptions).map((option) => {
            let rawValue = option.value || option.text;
            return safeParseNumber(rawValue);
          });
        } else if (modifiers.includes("boolean")) {
          return Array.from(event.target.selectedOptions).map((option) => {
            let rawValue = option.value || option.text;
            return safeParseBoolean(rawValue);
          });
        }
        return Array.from(event.target.selectedOptions).map((option) => {
          return option.value || option.text;
        });
      } else {
        let newValue;
        if (el.type === "radio") {
          if (event.target.checked) {
            newValue = event.target.value;
          } else {
            newValue = currentValue;
          }
        } else {
          newValue = event.target.value;
        }
        if (modifiers.includes("number")) {
          return safeParseNumber(newValue);
        } else if (modifiers.includes("boolean")) {
          return safeParseBoolean(newValue);
        } else if (modifiers.includes("trim")) {
          return newValue.trim();
        } else {
          return newValue;
        }
      }
    });
  }
  function safeParseNumber(rawValue) {
    let number = rawValue ? parseFloat(rawValue) : null;
    return isNumeric2(number) ? number : rawValue;
  }
  function checkedAttrLooseCompare2(valueA, valueB) {
    return valueA == valueB;
  }
  function isNumeric2(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }
  function isGetterSetter(value) {
    return value !== null && typeof value === "object" && typeof value.get === "function" && typeof value.set === "function";
  }
  directive("cloak", (el) => queueMicrotask(() => mutateDom(() => el.removeAttribute(prefix("cloak")))));
  addInitSelector(() => `[${prefix("init")}]`);
  directive("init", skipDuringClone((el, { expression }, { evaluate: evaluate2 }) => {
    if (typeof expression === "string") {
      return !!expression.trim() && evaluate2(expression, {}, false);
    }
    return evaluate2(expression, {}, false);
  }));
  directive("text", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
    let evaluate2 = evaluateLater2(expression);
    effect3(() => {
      evaluate2((value) => {
        mutateDom(() => {
          el.textContent = value;
        });
      });
    });
  });
  directive("html", (el, { expression }, { effect: effect3, evaluateLater: evaluateLater2 }) => {
    let evaluate2 = evaluateLater2(expression);
    effect3(() => {
      evaluate2((value) => {
        mutateDom(() => {
          el.innerHTML = value;
          el._x_ignoreSelf = true;
          initTree(el);
          delete el._x_ignoreSelf;
        });
      });
    });
  });
  mapAttributes(startingWith(":", into(prefix("bind:"))));
  var handler2 = (el, { value, modifiers, expression, original }, { effect: effect3, cleanup: cleanup2 }) => {
    if (!value) {
      let bindingProviders = {};
      injectBindingProviders(bindingProviders);
      let getBindings = evaluateLater(el, expression);
      getBindings((bindings) => {
        applyBindingsObject(el, bindings, original);
      }, { scope: bindingProviders });
      return;
    }
    if (value === "key")
      return storeKeyForXFor(el, expression);
    if (el._x_inlineBindings && el._x_inlineBindings[value] && el._x_inlineBindings[value].extract) {
      return;
    }
    let evaluate2 = evaluateLater(el, expression);
    effect3(() => evaluate2((result) => {
      if (result === void 0 && typeof expression === "string" && expression.match(/\./)) {
        result = "";
      }
      mutateDom(() => bind(el, value, result, modifiers));
    }));
    cleanup2(() => {
      el._x_undoAddedClasses && el._x_undoAddedClasses();
      el._x_undoAddedStyles && el._x_undoAddedStyles();
    });
  };
  handler2.inline = (el, { value, modifiers, expression }) => {
    if (!value)
      return;
    if (!el._x_inlineBindings)
      el._x_inlineBindings = {};
    el._x_inlineBindings[value] = { expression, extract: false };
  };
  directive("bind", handler2);
  function storeKeyForXFor(el, expression) {
    el._x_keyExpression = expression;
  }
  addRootSelector(() => `[${prefix("data")}]`);
  directive("data", (el, { expression }, { cleanup: cleanup2 }) => {
    if (shouldSkipRegisteringDataDuringClone(el))
      return;
    expression = expression === "" ? "{}" : expression;
    let magicContext = {};
    injectMagics(magicContext, el);
    let dataProviderContext = {};
    injectDataProviders(dataProviderContext, magicContext);
    let data2 = evaluate(el, expression, { scope: dataProviderContext });
    if (data2 === void 0 || data2 === true)
      data2 = {};
    injectMagics(data2, el);
    let reactiveData = reactive(data2);
    initInterceptors(reactiveData);
    let undo = addScopeToNode(el, reactiveData);
    reactiveData["init"] && evaluate(el, reactiveData["init"]);
    cleanup2(() => {
      reactiveData["destroy"] && evaluate(el, reactiveData["destroy"]);
      undo();
    });
  });
  interceptClone((from, to) => {
    if (from._x_dataStack) {
      to._x_dataStack = from._x_dataStack;
      to.setAttribute("data-has-alpine-state", true);
    }
  });
  function shouldSkipRegisteringDataDuringClone(el) {
    if (!isCloning)
      return false;
    if (isCloningLegacy)
      return true;
    return el.hasAttribute("data-has-alpine-state");
  }
  directive("show", (el, { modifiers, expression }, { effect: effect3 }) => {
    let evaluate2 = evaluateLater(el, expression);
    if (!el._x_doHide)
      el._x_doHide = () => {
        mutateDom(() => {
          el.style.setProperty("display", "none", modifiers.includes("important") ? "important" : void 0);
        });
      };
    if (!el._x_doShow)
      el._x_doShow = () => {
        mutateDom(() => {
          if (el.style.length === 1 && el.style.display === "none") {
            el.removeAttribute("style");
          } else {
            el.style.removeProperty("display");
          }
        });
      };
    let hide = () => {
      el._x_doHide();
      el._x_isShown = false;
    };
    let show = () => {
      el._x_doShow();
      el._x_isShown = true;
    };
    let clickAwayCompatibleShow = () => setTimeout(show);
    let toggle = once(
      (value) => value ? show() : hide(),
      (value) => {
        if (typeof el._x_toggleAndCascadeWithTransitions === "function") {
          el._x_toggleAndCascadeWithTransitions(el, value, show, hide);
        } else {
          value ? clickAwayCompatibleShow() : hide();
        }
      }
    );
    let oldValue;
    let firstTime = true;
    effect3(() => evaluate2((value) => {
      if (!firstTime && value === oldValue)
        return;
      if (modifiers.includes("immediate"))
        value ? clickAwayCompatibleShow() : hide();
      toggle(value);
      oldValue = value;
      firstTime = false;
    }));
  });
  directive("for", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
    let iteratorNames = parseForExpression(expression);
    let evaluateItems = evaluateLater(el, iteratorNames.items);
    let evaluateKey = evaluateLater(
      el,
      // the x-bind:key expression is stored for our use instead of evaluated.
      el._x_keyExpression || "index"
    );
    el._x_prevKeys = [];
    el._x_lookup = {};
    effect3(() => loop(el, iteratorNames, evaluateItems, evaluateKey));
    cleanup2(() => {
      Object.values(el._x_lookup).forEach((el2) => el2.remove());
      delete el._x_prevKeys;
      delete el._x_lookup;
    });
  });
  function loop(el, iteratorNames, evaluateItems, evaluateKey) {
    let isObject2 = (i) => typeof i === "object" && !Array.isArray(i);
    let templateEl = el;
    evaluateItems((items) => {
      if (isNumeric3(items) && items >= 0) {
        items = Array.from(Array(items).keys(), (i) => i + 1);
      }
      if (items === void 0)
        items = [];
      let lookup = el._x_lookup;
      let prevKeys = el._x_prevKeys;
      let scopes = [];
      let keys = [];
      if (isObject2(items)) {
        items = Object.entries(items).map(([key, value]) => {
          let scope2 = getIterationScopeVariables(iteratorNames, value, key, items);
          evaluateKey((value2) => {
            if (keys.includes(value2))
              warn("Duplicate key on x-for", el);
            keys.push(value2);
          }, { scope: { index: key, ...scope2 } });
          scopes.push(scope2);
        });
      } else {
        for (let i = 0; i < items.length; i++) {
          let scope2 = getIterationScopeVariables(iteratorNames, items[i], i, items);
          evaluateKey((value) => {
            if (keys.includes(value))
              warn("Duplicate key on x-for", el);
            keys.push(value);
          }, { scope: { index: i, ...scope2 } });
          scopes.push(scope2);
        }
      }
      let adds = [];
      let moves = [];
      let removes = [];
      let sames = [];
      for (let i = 0; i < prevKeys.length; i++) {
        let key = prevKeys[i];
        if (keys.indexOf(key) === -1)
          removes.push(key);
      }
      prevKeys = prevKeys.filter((key) => !removes.includes(key));
      let lastKey = "template";
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let prevIndex = prevKeys.indexOf(key);
        if (prevIndex === -1) {
          prevKeys.splice(i, 0, key);
          adds.push([lastKey, i]);
        } else if (prevIndex !== i) {
          let keyInSpot = prevKeys.splice(i, 1)[0];
          let keyForSpot = prevKeys.splice(prevIndex - 1, 1)[0];
          prevKeys.splice(i, 0, keyForSpot);
          prevKeys.splice(prevIndex, 0, keyInSpot);
          moves.push([keyInSpot, keyForSpot]);
        } else {
          sames.push(key);
        }
        lastKey = key;
      }
      for (let i = 0; i < removes.length; i++) {
        let key = removes[i];
        if (!!lookup[key]._x_effects) {
          lookup[key]._x_effects.forEach(dequeueJob);
        }
        lookup[key].remove();
        lookup[key] = null;
        delete lookup[key];
      }
      for (let i = 0; i < moves.length; i++) {
        let [keyInSpot, keyForSpot] = moves[i];
        let elInSpot = lookup[keyInSpot];
        let elForSpot = lookup[keyForSpot];
        let marker = document.createElement("div");
        mutateDom(() => {
          if (!elForSpot)
            warn(`x-for ":key" is undefined or invalid`, templateEl, keyForSpot, lookup);
          elForSpot.after(marker);
          elInSpot.after(elForSpot);
          elForSpot._x_currentIfEl && elForSpot.after(elForSpot._x_currentIfEl);
          marker.before(elInSpot);
          elInSpot._x_currentIfEl && elInSpot.after(elInSpot._x_currentIfEl);
          marker.remove();
        });
        elForSpot._x_refreshXForScope(scopes[keys.indexOf(keyForSpot)]);
      }
      for (let i = 0; i < adds.length; i++) {
        let [lastKey2, index] = adds[i];
        let lastEl = lastKey2 === "template" ? templateEl : lookup[lastKey2];
        if (lastEl._x_currentIfEl)
          lastEl = lastEl._x_currentIfEl;
        let scope2 = scopes[index];
        let key = keys[index];
        let clone2 = document.importNode(templateEl.content, true).firstElementChild;
        let reactiveScope = reactive(scope2);
        addScopeToNode(clone2, reactiveScope, templateEl);
        clone2._x_refreshXForScope = (newScope) => {
          Object.entries(newScope).forEach(([key2, value]) => {
            reactiveScope[key2] = value;
          });
        };
        mutateDom(() => {
          lastEl.after(clone2);
          skipDuringClone(() => initTree(clone2))();
        });
        if (typeof key === "object") {
          warn("x-for key cannot be an object, it must be a string or an integer", templateEl);
        }
        lookup[key] = clone2;
      }
      for (let i = 0; i < sames.length; i++) {
        lookup[sames[i]]._x_refreshXForScope(scopes[keys.indexOf(sames[i])]);
      }
      templateEl._x_prevKeys = keys;
    });
  }
  function parseForExpression(expression) {
    let forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
    let stripParensRE = /^\s*\(|\)\s*$/g;
    let forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
    let inMatch = expression.match(forAliasRE);
    if (!inMatch)
      return;
    let res = {};
    res.items = inMatch[2].trim();
    let item = inMatch[1].replace(stripParensRE, "").trim();
    let iteratorMatch = item.match(forIteratorRE);
    if (iteratorMatch) {
      res.item = item.replace(forIteratorRE, "").trim();
      res.index = iteratorMatch[1].trim();
      if (iteratorMatch[2]) {
        res.collection = iteratorMatch[2].trim();
      }
    } else {
      res.item = item;
    }
    return res;
  }
  function getIterationScopeVariables(iteratorNames, item, index, items) {
    let scopeVariables = {};
    if (/^\[.*\]$/.test(iteratorNames.item) && Array.isArray(item)) {
      let names = iteratorNames.item.replace("[", "").replace("]", "").split(",").map((i) => i.trim());
      names.forEach((name, i) => {
        scopeVariables[name] = item[i];
      });
    } else if (/^\{.*\}$/.test(iteratorNames.item) && !Array.isArray(item) && typeof item === "object") {
      let names = iteratorNames.item.replace("{", "").replace("}", "").split(",").map((i) => i.trim());
      names.forEach((name) => {
        scopeVariables[name] = item[name];
      });
    } else {
      scopeVariables[iteratorNames.item] = item;
    }
    if (iteratorNames.index)
      scopeVariables[iteratorNames.index] = index;
    if (iteratorNames.collection)
      scopeVariables[iteratorNames.collection] = items;
    return scopeVariables;
  }
  function isNumeric3(subject) {
    return !Array.isArray(subject) && !isNaN(subject);
  }
  function handler3() {
  }
  handler3.inline = (el, { expression }, { cleanup: cleanup2 }) => {
    let root = closestRoot(el);
    if (!root._x_refs)
      root._x_refs = {};
    root._x_refs[expression] = el;
    cleanup2(() => delete root._x_refs[expression]);
  };
  directive("ref", handler3);
  directive("if", (el, { expression }, { effect: effect3, cleanup: cleanup2 }) => {
    if (el.tagName.toLowerCase() !== "template")
      warn("x-if can only be used on a <template> tag", el);
    let evaluate2 = evaluateLater(el, expression);
    let show = () => {
      if (el._x_currentIfEl)
        return el._x_currentIfEl;
      let clone2 = el.content.cloneNode(true).firstElementChild;
      addScopeToNode(clone2, {}, el);
      mutateDom(() => {
        el.after(clone2);
        skipDuringClone(() => initTree(clone2))();
      });
      el._x_currentIfEl = clone2;
      el._x_undoIf = () => {
        walk(clone2, (node) => {
          if (!!node._x_effects) {
            node._x_effects.forEach(dequeueJob);
          }
        });
        clone2.remove();
        delete el._x_currentIfEl;
      };
      return clone2;
    };
    let hide = () => {
      if (!el._x_undoIf)
        return;
      el._x_undoIf();
      delete el._x_undoIf;
    };
    effect3(() => evaluate2((value) => {
      value ? show() : hide();
    }));
    cleanup2(() => el._x_undoIf && el._x_undoIf());
  });
  directive("id", (el, { expression }, { evaluate: evaluate2 }) => {
    let names = evaluate2(expression);
    names.forEach((name) => setIdRoot(el, name));
  });
  interceptClone((from, to) => {
    if (from._x_ids) {
      to._x_ids = from._x_ids;
    }
  });
  mapAttributes(startingWith("@", into(prefix("on:"))));
  directive("on", skipDuringClone((el, { value, modifiers, expression }, { cleanup: cleanup2 }) => {
    let evaluate2 = expression ? evaluateLater(el, expression) : () => {
    };
    if (el.tagName.toLowerCase() === "template") {
      if (!el._x_forwardEvents)
        el._x_forwardEvents = [];
      if (!el._x_forwardEvents.includes(value))
        el._x_forwardEvents.push(value);
    }
    let removeListener = on(el, value, modifiers, (e) => {
      evaluate2(() => {
      }, { scope: { "$event": e }, params: [e] });
    });
    cleanup2(() => removeListener());
  }));
  warnMissingPluginDirective("Collapse", "collapse", "collapse");
  warnMissingPluginDirective("Intersect", "intersect", "intersect");
  warnMissingPluginDirective("Focus", "trap", "focus");
  warnMissingPluginDirective("Mask", "mask", "mask");
  function warnMissingPluginDirective(name, directiveName, slug) {
    directive(directiveName, (el) => warn(`You can't use [x-${directiveName}] without first installing the "${name}" plugin here: https://alpinejs.dev/plugins/${slug}`, el));
  }
  alpine_default.setEvaluator(normalEvaluator);
  alpine_default.setReactivityEngine({ reactive: reactive2, effect: effect2, release: stop, raw: toRaw });
  var src_default = alpine_default;
  var module_default = src_default;

  // node_modules/@alpinejs/intersect/dist/module.esm.js
  function src_default2(Alpine2) {
    Alpine2.directive("intersect", Alpine2.skipDuringClone((el, { value, expression, modifiers }, { evaluateLater: evaluateLater2, cleanup: cleanup2 }) => {
      let evaluate2 = evaluateLater2(expression);
      let options = {
        rootMargin: getRootMargin(modifiers),
        threshold: getThreshold(modifiers)
      };
      let observer2 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting === (value === "leave"))
            return;
          evaluate2();
          modifiers.includes("once") && observer2.disconnect();
        });
      }, options);
      observer2.observe(el);
      cleanup2(() => {
        observer2.disconnect();
      });
    }));
  }
  function getThreshold(modifiers) {
    if (modifiers.includes("full"))
      return 0.99;
    if (modifiers.includes("half"))
      return 0.5;
    if (!modifiers.includes("threshold"))
      return 0;
    let threshold = modifiers[modifiers.indexOf("threshold") + 1];
    if (threshold === "100")
      return 1;
    if (threshold === "0")
      return 0;
    return Number(`.${threshold}`);
  }
  function getLengthValue(rawValue) {
    let match = rawValue.match(/^(-?[0-9]+)(px|%)?$/);
    return match ? match[1] + (match[2] || "px") : void 0;
  }
  function getRootMargin(modifiers) {
    const key = "margin";
    const fallback = "0px 0px 0px 0px";
    const index = modifiers.indexOf(key);
    if (index === -1)
      return fallback;
    let values = [];
    for (let i = 1; i < 5; i++) {
      values.push(getLengthValue(modifiers[index + i] || ""));
    }
    values = values.filter((v) => v !== void 0);
    return values.length ? values.join(" ").trim() : fallback;
  }
  var module_default2 = src_default2;

  // <stdin>
  (function() {
    module_default.plugin(module_default2);
    window.Alpine = module_default;
    module_default.start();
  })();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibm9kZV9tb2R1bGVzL2FscGluZWpzL2Rpc3QvbW9kdWxlLmVzbS5qcyIsICJub2RlX21vZHVsZXMvQGFscGluZWpzL2ludGVyc2VjdC9kaXN0L21vZHVsZS5lc20uanMiLCAiPHN0ZGluPiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3NjaGVkdWxlci5qc1xudmFyIGZsdXNoUGVuZGluZyA9IGZhbHNlO1xudmFyIGZsdXNoaW5nID0gZmFsc2U7XG52YXIgcXVldWUgPSBbXTtcbnZhciBsYXN0Rmx1c2hlZEluZGV4ID0gLTE7XG5mdW5jdGlvbiBzY2hlZHVsZXIoY2FsbGJhY2spIHtcbiAgcXVldWVKb2IoY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gcXVldWVKb2Ioam9iKSB7XG4gIGlmICghcXVldWUuaW5jbHVkZXMoam9iKSlcbiAgICBxdWV1ZS5wdXNoKGpvYik7XG4gIHF1ZXVlRmx1c2goKTtcbn1cbmZ1bmN0aW9uIGRlcXVldWVKb2Ioam9iKSB7XG4gIGxldCBpbmRleCA9IHF1ZXVlLmluZGV4T2Yoam9iKTtcbiAgaWYgKGluZGV4ICE9PSAtMSAmJiBpbmRleCA+IGxhc3RGbHVzaGVkSW5kZXgpXG4gICAgcXVldWUuc3BsaWNlKGluZGV4LCAxKTtcbn1cbmZ1bmN0aW9uIHF1ZXVlRmx1c2goKSB7XG4gIGlmICghZmx1c2hpbmcgJiYgIWZsdXNoUGVuZGluZykge1xuICAgIGZsdXNoUGVuZGluZyA9IHRydWU7XG4gICAgcXVldWVNaWNyb3Rhc2soZmx1c2hKb2JzKTtcbiAgfVxufVxuZnVuY3Rpb24gZmx1c2hKb2JzKCkge1xuICBmbHVzaFBlbmRpbmcgPSBmYWxzZTtcbiAgZmx1c2hpbmcgPSB0cnVlO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHF1ZXVlLmxlbmd0aDsgaSsrKSB7XG4gICAgcXVldWVbaV0oKTtcbiAgICBsYXN0Rmx1c2hlZEluZGV4ID0gaTtcbiAgfVxuICBxdWV1ZS5sZW5ndGggPSAwO1xuICBsYXN0Rmx1c2hlZEluZGV4ID0gLTE7XG4gIGZsdXNoaW5nID0gZmFsc2U7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9yZWFjdGl2aXR5LmpzXG52YXIgcmVhY3RpdmU7XG52YXIgZWZmZWN0O1xudmFyIHJlbGVhc2U7XG52YXIgcmF3O1xudmFyIHNob3VsZFNjaGVkdWxlID0gdHJ1ZTtcbmZ1bmN0aW9uIGRpc2FibGVFZmZlY3RTY2hlZHVsaW5nKGNhbGxiYWNrKSB7XG4gIHNob3VsZFNjaGVkdWxlID0gZmFsc2U7XG4gIGNhbGxiYWNrKCk7XG4gIHNob3VsZFNjaGVkdWxlID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIHNldFJlYWN0aXZpdHlFbmdpbmUoZW5naW5lKSB7XG4gIHJlYWN0aXZlID0gZW5naW5lLnJlYWN0aXZlO1xuICByZWxlYXNlID0gZW5naW5lLnJlbGVhc2U7XG4gIGVmZmVjdCA9IChjYWxsYmFjaykgPT4gZW5naW5lLmVmZmVjdChjYWxsYmFjaywgeyBzY2hlZHVsZXI6ICh0YXNrKSA9PiB7XG4gICAgaWYgKHNob3VsZFNjaGVkdWxlKSB7XG4gICAgICBzY2hlZHVsZXIodGFzayk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhc2soKTtcbiAgICB9XG4gIH0gfSk7XG4gIHJhdyA9IGVuZ2luZS5yYXc7XG59XG5mdW5jdGlvbiBvdmVycmlkZUVmZmVjdChvdmVycmlkZSkge1xuICBlZmZlY3QgPSBvdmVycmlkZTtcbn1cbmZ1bmN0aW9uIGVsZW1lbnRCb3VuZEVmZmVjdChlbCkge1xuICBsZXQgY2xlYW51cDIgPSAoKSA9PiB7XG4gIH07XG4gIGxldCB3cmFwcGVkRWZmZWN0ID0gKGNhbGxiYWNrKSA9PiB7XG4gICAgbGV0IGVmZmVjdFJlZmVyZW5jZSA9IGVmZmVjdChjYWxsYmFjayk7XG4gICAgaWYgKCFlbC5feF9lZmZlY3RzKSB7XG4gICAgICBlbC5feF9lZmZlY3RzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgICAgIGVsLl94X3J1bkVmZmVjdHMgPSAoKSA9PiB7XG4gICAgICAgIGVsLl94X2VmZmVjdHMuZm9yRWFjaCgoaSkgPT4gaSgpKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGVsLl94X2VmZmVjdHMuYWRkKGVmZmVjdFJlZmVyZW5jZSk7XG4gICAgY2xlYW51cDIgPSAoKSA9PiB7XG4gICAgICBpZiAoZWZmZWN0UmVmZXJlbmNlID09PSB2b2lkIDApXG4gICAgICAgIHJldHVybjtcbiAgICAgIGVsLl94X2VmZmVjdHMuZGVsZXRlKGVmZmVjdFJlZmVyZW5jZSk7XG4gICAgICByZWxlYXNlKGVmZmVjdFJlZmVyZW5jZSk7XG4gICAgfTtcbiAgICByZXR1cm4gZWZmZWN0UmVmZXJlbmNlO1xuICB9O1xuICByZXR1cm4gW3dyYXBwZWRFZmZlY3QsICgpID0+IHtcbiAgICBjbGVhbnVwMigpO1xuICB9XTtcbn1cbmZ1bmN0aW9uIHdhdGNoKGdldHRlciwgY2FsbGJhY2spIHtcbiAgbGV0IGZpcnN0VGltZSA9IHRydWU7XG4gIGxldCBvbGRWYWx1ZTtcbiAgbGV0IGVmZmVjdFJlZmVyZW5jZSA9IGVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IHZhbHVlID0gZ2V0dGVyKCk7XG4gICAgSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuICAgIGlmICghZmlyc3RUaW1lKSB7XG4gICAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgICAgIGNhbGxiYWNrKHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICAgIG9sZFZhbHVlID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2xkVmFsdWUgPSB2YWx1ZTtcbiAgICB9XG4gICAgZmlyc3RUaW1lID0gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gKCkgPT4gcmVsZWFzZShlZmZlY3RSZWZlcmVuY2UpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvbXV0YXRpb24uanNcbnZhciBvbkF0dHJpYnV0ZUFkZGVkcyA9IFtdO1xudmFyIG9uRWxSZW1vdmVkcyA9IFtdO1xudmFyIG9uRWxBZGRlZHMgPSBbXTtcbmZ1bmN0aW9uIG9uRWxBZGRlZChjYWxsYmFjaykge1xuICBvbkVsQWRkZWRzLnB1c2goY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gb25FbFJlbW92ZWQoZWwsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGlmICghZWwuX3hfY2xlYW51cHMpXG4gICAgICBlbC5feF9jbGVhbnVwcyA9IFtdO1xuICAgIGVsLl94X2NsZWFudXBzLnB1c2goY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIGNhbGxiYWNrID0gZWw7XG4gICAgb25FbFJlbW92ZWRzLnB1c2goY2FsbGJhY2spO1xuICB9XG59XG5mdW5jdGlvbiBvbkF0dHJpYnV0ZXNBZGRlZChjYWxsYmFjaykge1xuICBvbkF0dHJpYnV0ZUFkZGVkcy5wdXNoKGNhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIG9uQXR0cmlidXRlUmVtb3ZlZChlbCwgbmFtZSwgY2FsbGJhY2spIHtcbiAgaWYgKCFlbC5feF9hdHRyaWJ1dGVDbGVhbnVwcylcbiAgICBlbC5feF9hdHRyaWJ1dGVDbGVhbnVwcyA9IHt9O1xuICBpZiAoIWVsLl94X2F0dHJpYnV0ZUNsZWFudXBzW25hbWVdKVxuICAgIGVsLl94X2F0dHJpYnV0ZUNsZWFudXBzW25hbWVdID0gW107XG4gIGVsLl94X2F0dHJpYnV0ZUNsZWFudXBzW25hbWVdLnB1c2goY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gY2xlYW51cEF0dHJpYnV0ZXMoZWwsIG5hbWVzKSB7XG4gIGlmICghZWwuX3hfYXR0cmlidXRlQ2xlYW51cHMpXG4gICAgcmV0dXJuO1xuICBPYmplY3QuZW50cmllcyhlbC5feF9hdHRyaWJ1dGVDbGVhbnVwcykuZm9yRWFjaCgoW25hbWUsIHZhbHVlXSkgPT4ge1xuICAgIGlmIChuYW1lcyA9PT0gdm9pZCAwIHx8IG5hbWVzLmluY2x1ZGVzKG5hbWUpKSB7XG4gICAgICB2YWx1ZS5mb3JFYWNoKChpKSA9PiBpKCkpO1xuICAgICAgZGVsZXRlIGVsLl94X2F0dHJpYnV0ZUNsZWFudXBzW25hbWVdO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiBjbGVhbnVwRWxlbWVudChlbCkge1xuICBpZiAoZWwuX3hfY2xlYW51cHMpIHtcbiAgICB3aGlsZSAoZWwuX3hfY2xlYW51cHMubGVuZ3RoKVxuICAgICAgZWwuX3hfY2xlYW51cHMucG9wKCkoKTtcbiAgfVxufVxudmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIob25NdXRhdGUpO1xudmFyIGN1cnJlbnRseU9ic2VydmluZyA9IGZhbHNlO1xuZnVuY3Rpb24gc3RhcnRPYnNlcnZpbmdNdXRhdGlvbnMoKSB7XG4gIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQsIHsgc3VidHJlZTogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBhdHRyaWJ1dGVzOiB0cnVlLCBhdHRyaWJ1dGVPbGRWYWx1ZTogdHJ1ZSB9KTtcbiAgY3VycmVudGx5T2JzZXJ2aW5nID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIHN0b3BPYnNlcnZpbmdNdXRhdGlvbnMoKSB7XG4gIGZsdXNoT2JzZXJ2ZXIoKTtcbiAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICBjdXJyZW50bHlPYnNlcnZpbmcgPSBmYWxzZTtcbn1cbnZhciBxdWV1ZWRNdXRhdGlvbnMgPSBbXTtcbmZ1bmN0aW9uIGZsdXNoT2JzZXJ2ZXIoKSB7XG4gIGxldCByZWNvcmRzID0gb2JzZXJ2ZXIudGFrZVJlY29yZHMoKTtcbiAgcXVldWVkTXV0YXRpb25zLnB1c2goKCkgPT4gcmVjb3Jkcy5sZW5ndGggPiAwICYmIG9uTXV0YXRlKHJlY29yZHMpKTtcbiAgbGV0IHF1ZXVlTGVuZ3RoV2hlblRyaWdnZXJlZCA9IHF1ZXVlZE11dGF0aW9ucy5sZW5ndGg7XG4gIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICBpZiAocXVldWVkTXV0YXRpb25zLmxlbmd0aCA9PT0gcXVldWVMZW5ndGhXaGVuVHJpZ2dlcmVkKSB7XG4gICAgICB3aGlsZSAocXVldWVkTXV0YXRpb25zLmxlbmd0aCA+IDApXG4gICAgICAgIHF1ZXVlZE11dGF0aW9ucy5zaGlmdCgpKCk7XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIG11dGF0ZURvbShjYWxsYmFjaykge1xuICBpZiAoIWN1cnJlbnRseU9ic2VydmluZylcbiAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgc3RvcE9ic2VydmluZ011dGF0aW9ucygpO1xuICBsZXQgcmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgc3RhcnRPYnNlcnZpbmdNdXRhdGlvbnMoKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cbnZhciBpc0NvbGxlY3RpbmcgPSBmYWxzZTtcbnZhciBkZWZlcnJlZE11dGF0aW9ucyA9IFtdO1xuZnVuY3Rpb24gZGVmZXJNdXRhdGlvbnMoKSB7XG4gIGlzQ29sbGVjdGluZyA9IHRydWU7XG59XG5mdW5jdGlvbiBmbHVzaEFuZFN0b3BEZWZlcnJpbmdNdXRhdGlvbnMoKSB7XG4gIGlzQ29sbGVjdGluZyA9IGZhbHNlO1xuICBvbk11dGF0ZShkZWZlcnJlZE11dGF0aW9ucyk7XG4gIGRlZmVycmVkTXV0YXRpb25zID0gW107XG59XG5mdW5jdGlvbiBvbk11dGF0ZShtdXRhdGlvbnMpIHtcbiAgaWYgKGlzQ29sbGVjdGluZykge1xuICAgIGRlZmVycmVkTXV0YXRpb25zID0gZGVmZXJyZWRNdXRhdGlvbnMuY29uY2F0KG11dGF0aW9ucyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBhZGRlZE5vZGVzID0gLyogQF9fUFVSRV9fICovIG5ldyBTZXQoKTtcbiAgbGV0IHJlbW92ZWROb2RlcyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGxldCBhZGRlZEF0dHJpYnV0ZXMgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICBsZXQgcmVtb3ZlZEF0dHJpYnV0ZXMgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG11dGF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChtdXRhdGlvbnNbaV0udGFyZ2V0Ll94X2lnbm9yZU11dGF0aW9uT2JzZXJ2ZXIpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAobXV0YXRpb25zW2ldLnR5cGUgPT09IFwiY2hpbGRMaXN0XCIpIHtcbiAgICAgIG11dGF0aW9uc1tpXS5hZGRlZE5vZGVzLmZvckVhY2goKG5vZGUpID0+IG5vZGUubm9kZVR5cGUgPT09IDEgJiYgYWRkZWROb2Rlcy5hZGQobm9kZSkpO1xuICAgICAgbXV0YXRpb25zW2ldLnJlbW92ZWROb2Rlcy5mb3JFYWNoKChub2RlKSA9PiBub2RlLm5vZGVUeXBlID09PSAxICYmIHJlbW92ZWROb2Rlcy5hZGQobm9kZSkpO1xuICAgIH1cbiAgICBpZiAobXV0YXRpb25zW2ldLnR5cGUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICBsZXQgZWwgPSBtdXRhdGlvbnNbaV0udGFyZ2V0O1xuICAgICAgbGV0IG5hbWUgPSBtdXRhdGlvbnNbaV0uYXR0cmlidXRlTmFtZTtcbiAgICAgIGxldCBvbGRWYWx1ZSA9IG11dGF0aW9uc1tpXS5vbGRWYWx1ZTtcbiAgICAgIGxldCBhZGQyID0gKCkgPT4ge1xuICAgICAgICBpZiAoIWFkZGVkQXR0cmlidXRlcy5oYXMoZWwpKVxuICAgICAgICAgIGFkZGVkQXR0cmlidXRlcy5zZXQoZWwsIFtdKTtcbiAgICAgICAgYWRkZWRBdHRyaWJ1dGVzLmdldChlbCkucHVzaCh7IG5hbWUsIHZhbHVlOiBlbC5nZXRBdHRyaWJ1dGUobmFtZSkgfSk7XG4gICAgICB9O1xuICAgICAgbGV0IHJlbW92ZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKCFyZW1vdmVkQXR0cmlidXRlcy5oYXMoZWwpKVxuICAgICAgICAgIHJlbW92ZWRBdHRyaWJ1dGVzLnNldChlbCwgW10pO1xuICAgICAgICByZW1vdmVkQXR0cmlidXRlcy5nZXQoZWwpLnB1c2gobmFtZSk7XG4gICAgICB9O1xuICAgICAgaWYgKGVsLmhhc0F0dHJpYnV0ZShuYW1lKSAmJiBvbGRWYWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICBhZGQyKCk7XG4gICAgICB9IGVsc2UgaWYgKGVsLmhhc0F0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgICByZW1vdmUoKTtcbiAgICAgICAgYWRkMigpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVtb3ZlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJlbW92ZWRBdHRyaWJ1dGVzLmZvckVhY2goKGF0dHJzLCBlbCkgPT4ge1xuICAgIGNsZWFudXBBdHRyaWJ1dGVzKGVsLCBhdHRycyk7XG4gIH0pO1xuICBhZGRlZEF0dHJpYnV0ZXMuZm9yRWFjaCgoYXR0cnMsIGVsKSA9PiB7XG4gICAgb25BdHRyaWJ1dGVBZGRlZHMuZm9yRWFjaCgoaSkgPT4gaShlbCwgYXR0cnMpKTtcbiAgfSk7XG4gIGZvciAobGV0IG5vZGUgb2YgcmVtb3ZlZE5vZGVzKSB7XG4gICAgaWYgKGFkZGVkTm9kZXMuaGFzKG5vZGUpKVxuICAgICAgY29udGludWU7XG4gICAgb25FbFJlbW92ZWRzLmZvckVhY2goKGkpID0+IGkobm9kZSkpO1xuICB9XG4gIGFkZGVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgIG5vZGUuX3hfaWdub3JlU2VsZiA9IHRydWU7XG4gICAgbm9kZS5feF9pZ25vcmUgPSB0cnVlO1xuICB9KTtcbiAgZm9yIChsZXQgbm9kZSBvZiBhZGRlZE5vZGVzKSB7XG4gICAgaWYgKHJlbW92ZWROb2Rlcy5oYXMobm9kZSkpXG4gICAgICBjb250aW51ZTtcbiAgICBpZiAoIW5vZGUuaXNDb25uZWN0ZWQpXG4gICAgICBjb250aW51ZTtcbiAgICBkZWxldGUgbm9kZS5feF9pZ25vcmVTZWxmO1xuICAgIGRlbGV0ZSBub2RlLl94X2lnbm9yZTtcbiAgICBvbkVsQWRkZWRzLmZvckVhY2goKGkpID0+IGkobm9kZSkpO1xuICAgIG5vZGUuX3hfaWdub3JlID0gdHJ1ZTtcbiAgICBub2RlLl94X2lnbm9yZVNlbGYgPSB0cnVlO1xuICB9XG4gIGFkZGVkTm9kZXMuZm9yRWFjaCgobm9kZSkgPT4ge1xuICAgIGRlbGV0ZSBub2RlLl94X2lnbm9yZVNlbGY7XG4gICAgZGVsZXRlIG5vZGUuX3hfaWdub3JlO1xuICB9KTtcbiAgYWRkZWROb2RlcyA9IG51bGw7XG4gIHJlbW92ZWROb2RlcyA9IG51bGw7XG4gIGFkZGVkQXR0cmlidXRlcyA9IG51bGw7XG4gIHJlbW92ZWRBdHRyaWJ1dGVzID0gbnVsbDtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3Njb3BlLmpzXG5mdW5jdGlvbiBzY29wZShub2RlKSB7XG4gIHJldHVybiBtZXJnZVByb3hpZXMoY2xvc2VzdERhdGFTdGFjayhub2RlKSk7XG59XG5mdW5jdGlvbiBhZGRTY29wZVRvTm9kZShub2RlLCBkYXRhMiwgcmVmZXJlbmNlTm9kZSkge1xuICBub2RlLl94X2RhdGFTdGFjayA9IFtkYXRhMiwgLi4uY2xvc2VzdERhdGFTdGFjayhyZWZlcmVuY2VOb2RlIHx8IG5vZGUpXTtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBub2RlLl94X2RhdGFTdGFjayA9IG5vZGUuX3hfZGF0YVN0YWNrLmZpbHRlcigoaSkgPT4gaSAhPT0gZGF0YTIpO1xuICB9O1xufVxuZnVuY3Rpb24gY2xvc2VzdERhdGFTdGFjayhub2RlKSB7XG4gIGlmIChub2RlLl94X2RhdGFTdGFjaylcbiAgICByZXR1cm4gbm9kZS5feF9kYXRhU3RhY2s7XG4gIGlmICh0eXBlb2YgU2hhZG93Um9vdCA9PT0gXCJmdW5jdGlvblwiICYmIG5vZGUgaW5zdGFuY2VvZiBTaGFkb3dSb290KSB7XG4gICAgcmV0dXJuIGNsb3Nlc3REYXRhU3RhY2sobm9kZS5ob3N0KTtcbiAgfVxuICBpZiAoIW5vZGUucGFyZW50Tm9kZSkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuICByZXR1cm4gY2xvc2VzdERhdGFTdGFjayhub2RlLnBhcmVudE5vZGUpO1xufVxuZnVuY3Rpb24gbWVyZ2VQcm94aWVzKG9iamVjdHMpIHtcbiAgcmV0dXJuIG5ldyBQcm94eSh7IG9iamVjdHMgfSwgbWVyZ2VQcm94eVRyYXApO1xufVxudmFyIG1lcmdlUHJveHlUcmFwID0ge1xuICBvd25LZXlzKHsgb2JqZWN0cyB9KSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20oXG4gICAgICBuZXcgU2V0KG9iamVjdHMuZmxhdE1hcCgoaSkgPT4gT2JqZWN0LmtleXMoaSkpKVxuICAgICk7XG4gIH0sXG4gIGhhcyh7IG9iamVjdHMgfSwgbmFtZSkge1xuICAgIGlmIChuYW1lID09IFN5bWJvbC51bnNjb3BhYmxlcylcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gb2JqZWN0cy5zb21lKFxuICAgICAgKG9iaikgPT4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgbmFtZSkgfHwgUmVmbGVjdC5oYXMob2JqLCBuYW1lKVxuICAgICk7XG4gIH0sXG4gIGdldCh7IG9iamVjdHMgfSwgbmFtZSwgdGhpc1Byb3h5KSB7XG4gICAgaWYgKG5hbWUgPT0gXCJ0b0pTT05cIilcbiAgICAgIHJldHVybiBjb2xsYXBzZVByb3hpZXM7XG4gICAgcmV0dXJuIFJlZmxlY3QuZ2V0KFxuICAgICAgb2JqZWN0cy5maW5kKFxuICAgICAgICAob2JqKSA9PiBSZWZsZWN0LmhhcyhvYmosIG5hbWUpXG4gICAgICApIHx8IHt9LFxuICAgICAgbmFtZSxcbiAgICAgIHRoaXNQcm94eVxuICAgICk7XG4gIH0sXG4gIHNldCh7IG9iamVjdHMgfSwgbmFtZSwgdmFsdWUsIHRoaXNQcm94eSkge1xuICAgIGNvbnN0IHRhcmdldCA9IG9iamVjdHMuZmluZChcbiAgICAgIChvYmopID0+IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIG5hbWUpXG4gICAgKSB8fCBvYmplY3RzW29iamVjdHMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgZGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvcj8uc2V0ICYmIGRlc2NyaXB0b3I/LmdldClcbiAgICAgIHJldHVybiBkZXNjcmlwdG9yLnNldC5jYWxsKHRoaXNQcm94eSwgdmFsdWUpIHx8IHRydWU7XG4gICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRhcmdldCwgbmFtZSwgdmFsdWUpO1xuICB9XG59O1xuZnVuY3Rpb24gY29sbGFwc2VQcm94aWVzKCkge1xuICBsZXQga2V5cyA9IFJlZmxlY3Qub3duS2V5cyh0aGlzKTtcbiAgcmV0dXJuIGtleXMucmVkdWNlKChhY2MsIGtleSkgPT4ge1xuICAgIGFjY1trZXldID0gUmVmbGVjdC5nZXQodGhpcywga2V5KTtcbiAgICByZXR1cm4gYWNjO1xuICB9LCB7fSk7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9pbnRlcmNlcHRvci5qc1xuZnVuY3Rpb24gaW5pdEludGVyY2VwdG9ycyhkYXRhMikge1xuICBsZXQgaXNPYmplY3QyID0gKHZhbCkgPT4gdHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSh2YWwpICYmIHZhbCAhPT0gbnVsbDtcbiAgbGV0IHJlY3Vyc2UgPSAob2JqLCBiYXNlUGF0aCA9IFwiXCIpID0+IHtcbiAgICBPYmplY3QuZW50cmllcyhPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhvYmopKS5mb3JFYWNoKChba2V5LCB7IHZhbHVlLCBlbnVtZXJhYmxlIH1dKSA9PiB7XG4gICAgICBpZiAoZW51bWVyYWJsZSA9PT0gZmFsc2UgfHwgdmFsdWUgPT09IHZvaWQgMClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZS5fX3Zfc2tpcClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgbGV0IHBhdGggPSBiYXNlUGF0aCA9PT0gXCJcIiA/IGtleSA6IGAke2Jhc2VQYXRofS4ke2tleX1gO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZS5feF9pbnRlcmNlcHRvcikge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlLmluaXRpYWxpemUoZGF0YTIsIHBhdGgsIGtleSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaXNPYmplY3QyKHZhbHVlKSAmJiB2YWx1ZSAhPT0gb2JqICYmICEodmFsdWUgaW5zdGFuY2VvZiBFbGVtZW50KSkge1xuICAgICAgICAgIHJlY3Vyc2UodmFsdWUsIHBhdGgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG4gIHJldHVybiByZWN1cnNlKGRhdGEyKTtcbn1cbmZ1bmN0aW9uIGludGVyY2VwdG9yKGNhbGxiYWNrLCBtdXRhdGVPYmogPSAoKSA9PiB7XG59KSB7XG4gIGxldCBvYmogPSB7XG4gICAgaW5pdGlhbFZhbHVlOiB2b2lkIDAsXG4gICAgX3hfaW50ZXJjZXB0b3I6IHRydWUsXG4gICAgaW5pdGlhbGl6ZShkYXRhMiwgcGF0aCwga2V5KSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sodGhpcy5pbml0aWFsVmFsdWUsICgpID0+IGdldChkYXRhMiwgcGF0aCksICh2YWx1ZSkgPT4gc2V0KGRhdGEyLCBwYXRoLCB2YWx1ZSksIHBhdGgsIGtleSk7XG4gICAgfVxuICB9O1xuICBtdXRhdGVPYmoob2JqKTtcbiAgcmV0dXJuIChpbml0aWFsVmFsdWUpID0+IHtcbiAgICBpZiAodHlwZW9mIGluaXRpYWxWYWx1ZSA9PT0gXCJvYmplY3RcIiAmJiBpbml0aWFsVmFsdWUgIT09IG51bGwgJiYgaW5pdGlhbFZhbHVlLl94X2ludGVyY2VwdG9yKSB7XG4gICAgICBsZXQgaW5pdGlhbGl6ZSA9IG9iai5pbml0aWFsaXplLmJpbmQob2JqKTtcbiAgICAgIG9iai5pbml0aWFsaXplID0gKGRhdGEyLCBwYXRoLCBrZXkpID0+IHtcbiAgICAgICAgbGV0IGlubmVyVmFsdWUgPSBpbml0aWFsVmFsdWUuaW5pdGlhbGl6ZShkYXRhMiwgcGF0aCwga2V5KTtcbiAgICAgICAgb2JqLmluaXRpYWxWYWx1ZSA9IGlubmVyVmFsdWU7XG4gICAgICAgIHJldHVybiBpbml0aWFsaXplKGRhdGEyLCBwYXRoLCBrZXkpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgb2JqLmluaXRpYWxWYWx1ZSA9IGluaXRpYWxWYWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcbn1cbmZ1bmN0aW9uIGdldChvYmosIHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpLnJlZHVjZSgoY2FycnksIHNlZ21lbnQpID0+IGNhcnJ5W3NlZ21lbnRdLCBvYmopO1xufVxuZnVuY3Rpb24gc2V0KG9iaiwgcGF0aCwgdmFsdWUpIHtcbiAgaWYgKHR5cGVvZiBwYXRoID09PSBcInN0cmluZ1wiKVxuICAgIHBhdGggPSBwYXRoLnNwbGl0KFwiLlwiKTtcbiAgaWYgKHBhdGgubGVuZ3RoID09PSAxKVxuICAgIG9ialtwYXRoWzBdXSA9IHZhbHVlO1xuICBlbHNlIGlmIChwYXRoLmxlbmd0aCA9PT0gMClcbiAgICB0aHJvdyBlcnJvcjtcbiAgZWxzZSB7XG4gICAgaWYgKG9ialtwYXRoWzBdXSlcbiAgICAgIHJldHVybiBzZXQob2JqW3BhdGhbMF1dLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSk7XG4gICAgZWxzZSB7XG4gICAgICBvYmpbcGF0aFswXV0gPSB7fTtcbiAgICAgIHJldHVybiBzZXQob2JqW3BhdGhbMF1dLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSk7XG4gICAgfVxuICB9XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9tYWdpY3MuanNcbnZhciBtYWdpY3MgPSB7fTtcbmZ1bmN0aW9uIG1hZ2ljKG5hbWUsIGNhbGxiYWNrKSB7XG4gIG1hZ2ljc1tuYW1lXSA9IGNhbGxiYWNrO1xufVxuZnVuY3Rpb24gaW5qZWN0TWFnaWNzKG9iaiwgZWwpIHtcbiAgT2JqZWN0LmVudHJpZXMobWFnaWNzKS5mb3JFYWNoKChbbmFtZSwgY2FsbGJhY2tdKSA9PiB7XG4gICAgbGV0IG1lbW9pemVkVXRpbGl0aWVzID0gbnVsbDtcbiAgICBmdW5jdGlvbiBnZXRVdGlsaXRpZXMoKSB7XG4gICAgICBpZiAobWVtb2l6ZWRVdGlsaXRpZXMpIHtcbiAgICAgICAgcmV0dXJuIG1lbW9pemVkVXRpbGl0aWVzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGV0IFt1dGlsaXRpZXMsIGNsZWFudXAyXSA9IGdldEVsZW1lbnRCb3VuZFV0aWxpdGllcyhlbCk7XG4gICAgICAgIG1lbW9pemVkVXRpbGl0aWVzID0geyBpbnRlcmNlcHRvciwgLi4udXRpbGl0aWVzIH07XG4gICAgICAgIG9uRWxSZW1vdmVkKGVsLCBjbGVhbnVwMik7XG4gICAgICAgIHJldHVybiBtZW1vaXplZFV0aWxpdGllcztcbiAgICAgIH1cbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgYCQke25hbWV9YCwge1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZWwsIGdldFV0aWxpdGllcygpKTtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3V0aWxzL2Vycm9yLmpzXG5mdW5jdGlvbiB0cnlDYXRjaChlbCwgZXhwcmVzc2lvbiwgY2FsbGJhY2ssIC4uLmFyZ3MpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gY2FsbGJhY2soLi4uYXJncyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBoYW5kbGVFcnJvcihlLCBlbCwgZXhwcmVzc2lvbik7XG4gIH1cbn1cbmZ1bmN0aW9uIGhhbmRsZUVycm9yKGVycm9yMiwgZWwsIGV4cHJlc3Npb24gPSB2b2lkIDApIHtcbiAgZXJyb3IyID0gT2JqZWN0LmFzc2lnbihcbiAgICBlcnJvcjIgPz8geyBtZXNzYWdlOiBcIk5vIGVycm9yIG1lc3NhZ2UgZ2l2ZW4uXCIgfSxcbiAgICB7IGVsLCBleHByZXNzaW9uIH1cbiAgKTtcbiAgY29uc29sZS53YXJuKGBBbHBpbmUgRXhwcmVzc2lvbiBFcnJvcjogJHtlcnJvcjIubWVzc2FnZX1cblxuJHtleHByZXNzaW9uID8gJ0V4cHJlc3Npb246IFwiJyArIGV4cHJlc3Npb24gKyAnXCJcXG5cXG4nIDogXCJcIn1gLCBlbCk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHRocm93IGVycm9yMjtcbiAgfSwgMCk7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9ldmFsdWF0b3IuanNcbnZhciBzaG91bGRBdXRvRXZhbHVhdGVGdW5jdGlvbnMgPSB0cnVlO1xuZnVuY3Rpb24gZG9udEF1dG9FdmFsdWF0ZUZ1bmN0aW9ucyhjYWxsYmFjaykge1xuICBsZXQgY2FjaGUgPSBzaG91bGRBdXRvRXZhbHVhdGVGdW5jdGlvbnM7XG4gIHNob3VsZEF1dG9FdmFsdWF0ZUZ1bmN0aW9ucyA9IGZhbHNlO1xuICBsZXQgcmVzdWx0ID0gY2FsbGJhY2soKTtcbiAgc2hvdWxkQXV0b0V2YWx1YXRlRnVuY3Rpb25zID0gY2FjaGU7XG4gIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBldmFsdWF0ZShlbCwgZXhwcmVzc2lvbiwgZXh0cmFzID0ge30pIHtcbiAgbGV0IHJlc3VsdDtcbiAgZXZhbHVhdGVMYXRlcihlbCwgZXhwcmVzc2lvbikoKHZhbHVlKSA9PiByZXN1bHQgPSB2YWx1ZSwgZXh0cmFzKTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGV2YWx1YXRlTGF0ZXIoLi4uYXJncykge1xuICByZXR1cm4gdGhlRXZhbHVhdG9yRnVuY3Rpb24oLi4uYXJncyk7XG59XG52YXIgdGhlRXZhbHVhdG9yRnVuY3Rpb24gPSBub3JtYWxFdmFsdWF0b3I7XG5mdW5jdGlvbiBzZXRFdmFsdWF0b3IobmV3RXZhbHVhdG9yKSB7XG4gIHRoZUV2YWx1YXRvckZ1bmN0aW9uID0gbmV3RXZhbHVhdG9yO1xufVxuZnVuY3Rpb24gbm9ybWFsRXZhbHVhdG9yKGVsLCBleHByZXNzaW9uKSB7XG4gIGxldCBvdmVycmlkZGVuTWFnaWNzID0ge307XG4gIGluamVjdE1hZ2ljcyhvdmVycmlkZGVuTWFnaWNzLCBlbCk7XG4gIGxldCBkYXRhU3RhY2sgPSBbb3ZlcnJpZGRlbk1hZ2ljcywgLi4uY2xvc2VzdERhdGFTdGFjayhlbCldO1xuICBsZXQgZXZhbHVhdG9yID0gdHlwZW9mIGV4cHJlc3Npb24gPT09IFwiZnVuY3Rpb25cIiA/IGdlbmVyYXRlRXZhbHVhdG9yRnJvbUZ1bmN0aW9uKGRhdGFTdGFjaywgZXhwcmVzc2lvbikgOiBnZW5lcmF0ZUV2YWx1YXRvckZyb21TdHJpbmcoZGF0YVN0YWNrLCBleHByZXNzaW9uLCBlbCk7XG4gIHJldHVybiB0cnlDYXRjaC5iaW5kKG51bGwsIGVsLCBleHByZXNzaW9uLCBldmFsdWF0b3IpO1xufVxuZnVuY3Rpb24gZ2VuZXJhdGVFdmFsdWF0b3JGcm9tRnVuY3Rpb24oZGF0YVN0YWNrLCBmdW5jKSB7XG4gIHJldHVybiAocmVjZWl2ZXIgPSAoKSA9PiB7XG4gIH0sIHsgc2NvcGU6IHNjb3BlMiA9IHt9LCBwYXJhbXMgPSBbXSB9ID0ge30pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gZnVuYy5hcHBseShtZXJnZVByb3hpZXMoW3Njb3BlMiwgLi4uZGF0YVN0YWNrXSksIHBhcmFtcyk7XG4gICAgcnVuSWZUeXBlT2ZGdW5jdGlvbihyZWNlaXZlciwgcmVzdWx0KTtcbiAgfTtcbn1cbnZhciBldmFsdWF0b3JNZW1vID0ge307XG5mdW5jdGlvbiBnZW5lcmF0ZUZ1bmN0aW9uRnJvbVN0cmluZyhleHByZXNzaW9uLCBlbCkge1xuICBpZiAoZXZhbHVhdG9yTWVtb1tleHByZXNzaW9uXSkge1xuICAgIHJldHVybiBldmFsdWF0b3JNZW1vW2V4cHJlc3Npb25dO1xuICB9XG4gIGxldCBBc3luY0Z1bmN0aW9uID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGFzeW5jIGZ1bmN0aW9uKCkge1xuICB9KS5jb25zdHJ1Y3RvcjtcbiAgbGV0IHJpZ2h0U2lkZVNhZmVFeHByZXNzaW9uID0gL15bXFxuXFxzXSppZi4qXFwoLipcXCkvLnRlc3QoZXhwcmVzc2lvbi50cmltKCkpIHx8IC9eKGxldHxjb25zdClcXHMvLnRlc3QoZXhwcmVzc2lvbi50cmltKCkpID8gYChhc3luYygpPT57ICR7ZXhwcmVzc2lvbn0gfSkoKWAgOiBleHByZXNzaW9uO1xuICBjb25zdCBzYWZlQXN5bmNGdW5jdGlvbiA9ICgpID0+IHtcbiAgICB0cnkge1xuICAgICAgbGV0IGZ1bmMyID0gbmV3IEFzeW5jRnVuY3Rpb24oXG4gICAgICAgIFtcIl9fc2VsZlwiLCBcInNjb3BlXCJdLFxuICAgICAgICBgd2l0aCAoc2NvcGUpIHsgX19zZWxmLnJlc3VsdCA9ICR7cmlnaHRTaWRlU2FmZUV4cHJlc3Npb259IH07IF9fc2VsZi5maW5pc2hlZCA9IHRydWU7IHJldHVybiBfX3NlbGYucmVzdWx0O2BcbiAgICAgICk7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZnVuYzIsIFwibmFtZVwiLCB7XG4gICAgICAgIHZhbHVlOiBgW0FscGluZV0gJHtleHByZXNzaW9ufWBcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZ1bmMyO1xuICAgIH0gY2F0Y2ggKGVycm9yMikge1xuICAgICAgaGFuZGxlRXJyb3IoZXJyb3IyLCBlbCwgZXhwcmVzc2lvbik7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICB9O1xuICBsZXQgZnVuYyA9IHNhZmVBc3luY0Z1bmN0aW9uKCk7XG4gIGV2YWx1YXRvck1lbW9bZXhwcmVzc2lvbl0gPSBmdW5jO1xuICByZXR1cm4gZnVuYztcbn1cbmZ1bmN0aW9uIGdlbmVyYXRlRXZhbHVhdG9yRnJvbVN0cmluZyhkYXRhU3RhY2ssIGV4cHJlc3Npb24sIGVsKSB7XG4gIGxldCBmdW5jID0gZ2VuZXJhdGVGdW5jdGlvbkZyb21TdHJpbmcoZXhwcmVzc2lvbiwgZWwpO1xuICByZXR1cm4gKHJlY2VpdmVyID0gKCkgPT4ge1xuICB9LCB7IHNjb3BlOiBzY29wZTIgPSB7fSwgcGFyYW1zID0gW10gfSA9IHt9KSA9PiB7XG4gICAgZnVuYy5yZXN1bHQgPSB2b2lkIDA7XG4gICAgZnVuYy5maW5pc2hlZCA9IGZhbHNlO1xuICAgIGxldCBjb21wbGV0ZVNjb3BlID0gbWVyZ2VQcm94aWVzKFtzY29wZTIsIC4uLmRhdGFTdGFja10pO1xuICAgIGlmICh0eXBlb2YgZnVuYyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBsZXQgcHJvbWlzZSA9IGZ1bmMoZnVuYywgY29tcGxldGVTY29wZSkuY2F0Y2goKGVycm9yMikgPT4gaGFuZGxlRXJyb3IoZXJyb3IyLCBlbCwgZXhwcmVzc2lvbikpO1xuICAgICAgaWYgKGZ1bmMuZmluaXNoZWQpIHtcbiAgICAgICAgcnVuSWZUeXBlT2ZGdW5jdGlvbihyZWNlaXZlciwgZnVuYy5yZXN1bHQsIGNvbXBsZXRlU2NvcGUsIHBhcmFtcywgZWwpO1xuICAgICAgICBmdW5jLnJlc3VsdCA9IHZvaWQgMDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb21pc2UudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgICAgcnVuSWZUeXBlT2ZGdW5jdGlvbihyZWNlaXZlciwgcmVzdWx0LCBjb21wbGV0ZVNjb3BlLCBwYXJhbXMsIGVsKTtcbiAgICAgICAgfSkuY2F0Y2goKGVycm9yMikgPT4gaGFuZGxlRXJyb3IoZXJyb3IyLCBlbCwgZXhwcmVzc2lvbikpLmZpbmFsbHkoKCkgPT4gZnVuYy5yZXN1bHQgPSB2b2lkIDApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cbmZ1bmN0aW9uIHJ1bklmVHlwZU9mRnVuY3Rpb24ocmVjZWl2ZXIsIHZhbHVlLCBzY29wZTIsIHBhcmFtcywgZWwpIHtcbiAgaWYgKHNob3VsZEF1dG9FdmFsdWF0ZUZ1bmN0aW9ucyAmJiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIGxldCByZXN1bHQgPSB2YWx1ZS5hcHBseShzY29wZTIsIHBhcmFtcyk7XG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgIHJlc3VsdC50aGVuKChpKSA9PiBydW5JZlR5cGVPZkZ1bmN0aW9uKHJlY2VpdmVyLCBpLCBzY29wZTIsIHBhcmFtcykpLmNhdGNoKChlcnJvcjIpID0+IGhhbmRsZUVycm9yKGVycm9yMiwgZWwsIHZhbHVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlY2VpdmVyKHJlc3VsdCk7XG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICB2YWx1ZS50aGVuKChpKSA9PiByZWNlaXZlcihpKSk7XG4gIH0gZWxzZSB7XG4gICAgcmVjZWl2ZXIodmFsdWUpO1xuICB9XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9kaXJlY3RpdmVzLmpzXG52YXIgcHJlZml4QXNTdHJpbmcgPSBcIngtXCI7XG5mdW5jdGlvbiBwcmVmaXgoc3ViamVjdCA9IFwiXCIpIHtcbiAgcmV0dXJuIHByZWZpeEFzU3RyaW5nICsgc3ViamVjdDtcbn1cbmZ1bmN0aW9uIHNldFByZWZpeChuZXdQcmVmaXgpIHtcbiAgcHJlZml4QXNTdHJpbmcgPSBuZXdQcmVmaXg7XG59XG52YXIgZGlyZWN0aXZlSGFuZGxlcnMgPSB7fTtcbmZ1bmN0aW9uIGRpcmVjdGl2ZShuYW1lLCBjYWxsYmFjaykge1xuICBkaXJlY3RpdmVIYW5kbGVyc1tuYW1lXSA9IGNhbGxiYWNrO1xuICByZXR1cm4ge1xuICAgIGJlZm9yZShkaXJlY3RpdmUyKSB7XG4gICAgICBpZiAoIWRpcmVjdGl2ZUhhbmRsZXJzW2RpcmVjdGl2ZTJdKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihTdHJpbmcucmF3YENhbm5vdCBmaW5kIGRpcmVjdGl2ZSBcXGAke2RpcmVjdGl2ZTJ9XFxgLiBcXGAke25hbWV9XFxgIHdpbGwgdXNlIHRoZSBkZWZhdWx0IG9yZGVyIG9mIGV4ZWN1dGlvbmApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwb3MgPSBkaXJlY3RpdmVPcmRlci5pbmRleE9mKGRpcmVjdGl2ZTIpO1xuICAgICAgZGlyZWN0aXZlT3JkZXIuc3BsaWNlKHBvcyA+PSAwID8gcG9zIDogZGlyZWN0aXZlT3JkZXIuaW5kZXhPZihcIkRFRkFVTFRcIiksIDAsIG5hbWUpO1xuICAgIH1cbiAgfTtcbn1cbmZ1bmN0aW9uIGRpcmVjdGl2ZUV4aXN0cyhuYW1lKSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhkaXJlY3RpdmVIYW5kbGVycykuaW5jbHVkZXMobmFtZSk7XG59XG5mdW5jdGlvbiBkaXJlY3RpdmVzKGVsLCBhdHRyaWJ1dGVzLCBvcmlnaW5hbEF0dHJpYnV0ZU92ZXJyaWRlKSB7XG4gIGF0dHJpYnV0ZXMgPSBBcnJheS5mcm9tKGF0dHJpYnV0ZXMpO1xuICBpZiAoZWwuX3hfdmlydHVhbERpcmVjdGl2ZXMpIHtcbiAgICBsZXQgdkF0dHJpYnV0ZXMgPSBPYmplY3QuZW50cmllcyhlbC5feF92aXJ0dWFsRGlyZWN0aXZlcykubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoeyBuYW1lLCB2YWx1ZSB9KSk7XG4gICAgbGV0IHN0YXRpY0F0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzT25seSh2QXR0cmlidXRlcyk7XG4gICAgdkF0dHJpYnV0ZXMgPSB2QXR0cmlidXRlcy5tYXAoKGF0dHJpYnV0ZSkgPT4ge1xuICAgICAgaWYgKHN0YXRpY0F0dHJpYnV0ZXMuZmluZCgoYXR0cikgPT4gYXR0ci5uYW1lID09PSBhdHRyaWJ1dGUubmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBuYW1lOiBgeC1iaW5kOiR7YXR0cmlidXRlLm5hbWV9YCxcbiAgICAgICAgICB2YWx1ZTogYFwiJHthdHRyaWJ1dGUudmFsdWV9XCJgXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXR0cmlidXRlO1xuICAgIH0pO1xuICAgIGF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzLmNvbmNhdCh2QXR0cmlidXRlcyk7XG4gIH1cbiAgbGV0IHRyYW5zZm9ybWVkQXR0cmlidXRlTWFwID0ge307XG4gIGxldCBkaXJlY3RpdmVzMiA9IGF0dHJpYnV0ZXMubWFwKHRvVHJhbnNmb3JtZWRBdHRyaWJ1dGVzKChuZXdOYW1lLCBvbGROYW1lKSA9PiB0cmFuc2Zvcm1lZEF0dHJpYnV0ZU1hcFtuZXdOYW1lXSA9IG9sZE5hbWUpKS5maWx0ZXIob3V0Tm9uQWxwaW5lQXR0cmlidXRlcykubWFwKHRvUGFyc2VkRGlyZWN0aXZlcyh0cmFuc2Zvcm1lZEF0dHJpYnV0ZU1hcCwgb3JpZ2luYWxBdHRyaWJ1dGVPdmVycmlkZSkpLnNvcnQoYnlQcmlvcml0eSk7XG4gIHJldHVybiBkaXJlY3RpdmVzMi5tYXAoKGRpcmVjdGl2ZTIpID0+IHtcbiAgICByZXR1cm4gZ2V0RGlyZWN0aXZlSGFuZGxlcihlbCwgZGlyZWN0aXZlMik7XG4gIH0pO1xufVxuZnVuY3Rpb24gYXR0cmlidXRlc09ubHkoYXR0cmlidXRlcykge1xuICByZXR1cm4gQXJyYXkuZnJvbShhdHRyaWJ1dGVzKS5tYXAodG9UcmFuc2Zvcm1lZEF0dHJpYnV0ZXMoKSkuZmlsdGVyKChhdHRyKSA9PiAhb3V0Tm9uQWxwaW5lQXR0cmlidXRlcyhhdHRyKSk7XG59XG52YXIgaXNEZWZlcnJpbmdIYW5kbGVycyA9IGZhbHNlO1xudmFyIGRpcmVjdGl2ZUhhbmRsZXJTdGFja3MgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpO1xudmFyIGN1cnJlbnRIYW5kbGVyU3RhY2tLZXkgPSBTeW1ib2woKTtcbmZ1bmN0aW9uIGRlZmVySGFuZGxpbmdEaXJlY3RpdmVzKGNhbGxiYWNrKSB7XG4gIGlzRGVmZXJyaW5nSGFuZGxlcnMgPSB0cnVlO1xuICBsZXQga2V5ID0gU3ltYm9sKCk7XG4gIGN1cnJlbnRIYW5kbGVyU3RhY2tLZXkgPSBrZXk7XG4gIGRpcmVjdGl2ZUhhbmRsZXJTdGFja3Muc2V0KGtleSwgW10pO1xuICBsZXQgZmx1c2hIYW5kbGVycyA9ICgpID0+IHtcbiAgICB3aGlsZSAoZGlyZWN0aXZlSGFuZGxlclN0YWNrcy5nZXQoa2V5KS5sZW5ndGgpXG4gICAgICBkaXJlY3RpdmVIYW5kbGVyU3RhY2tzLmdldChrZXkpLnNoaWZ0KCkoKTtcbiAgICBkaXJlY3RpdmVIYW5kbGVyU3RhY2tzLmRlbGV0ZShrZXkpO1xuICB9O1xuICBsZXQgc3RvcERlZmVycmluZyA9ICgpID0+IHtcbiAgICBpc0RlZmVycmluZ0hhbmRsZXJzID0gZmFsc2U7XG4gICAgZmx1c2hIYW5kbGVycygpO1xuICB9O1xuICBjYWxsYmFjayhmbHVzaEhhbmRsZXJzKTtcbiAgc3RvcERlZmVycmluZygpO1xufVxuZnVuY3Rpb24gZ2V0RWxlbWVudEJvdW5kVXRpbGl0aWVzKGVsKSB7XG4gIGxldCBjbGVhbnVwcyA9IFtdO1xuICBsZXQgY2xlYW51cDIgPSAoY2FsbGJhY2spID0+IGNsZWFudXBzLnB1c2goY2FsbGJhY2spO1xuICBsZXQgW2VmZmVjdDMsIGNsZWFudXBFZmZlY3RdID0gZWxlbWVudEJvdW5kRWZmZWN0KGVsKTtcbiAgY2xlYW51cHMucHVzaChjbGVhbnVwRWZmZWN0KTtcbiAgbGV0IHV0aWxpdGllcyA9IHtcbiAgICBBbHBpbmU6IGFscGluZV9kZWZhdWx0LFxuICAgIGVmZmVjdDogZWZmZWN0MyxcbiAgICBjbGVhbnVwOiBjbGVhbnVwMixcbiAgICBldmFsdWF0ZUxhdGVyOiBldmFsdWF0ZUxhdGVyLmJpbmQoZXZhbHVhdGVMYXRlciwgZWwpLFxuICAgIGV2YWx1YXRlOiBldmFsdWF0ZS5iaW5kKGV2YWx1YXRlLCBlbClcbiAgfTtcbiAgbGV0IGRvQ2xlYW51cCA9ICgpID0+IGNsZWFudXBzLmZvckVhY2goKGkpID0+IGkoKSk7XG4gIHJldHVybiBbdXRpbGl0aWVzLCBkb0NsZWFudXBdO1xufVxuZnVuY3Rpb24gZ2V0RGlyZWN0aXZlSGFuZGxlcihlbCwgZGlyZWN0aXZlMikge1xuICBsZXQgbm9vcCA9ICgpID0+IHtcbiAgfTtcbiAgbGV0IGhhbmRsZXI0ID0gZGlyZWN0aXZlSGFuZGxlcnNbZGlyZWN0aXZlMi50eXBlXSB8fCBub29wO1xuICBsZXQgW3V0aWxpdGllcywgY2xlYW51cDJdID0gZ2V0RWxlbWVudEJvdW5kVXRpbGl0aWVzKGVsKTtcbiAgb25BdHRyaWJ1dGVSZW1vdmVkKGVsLCBkaXJlY3RpdmUyLm9yaWdpbmFsLCBjbGVhbnVwMik7XG4gIGxldCBmdWxsSGFuZGxlciA9ICgpID0+IHtcbiAgICBpZiAoZWwuX3hfaWdub3JlIHx8IGVsLl94X2lnbm9yZVNlbGYpXG4gICAgICByZXR1cm47XG4gICAgaGFuZGxlcjQuaW5saW5lICYmIGhhbmRsZXI0LmlubGluZShlbCwgZGlyZWN0aXZlMiwgdXRpbGl0aWVzKTtcbiAgICBoYW5kbGVyNCA9IGhhbmRsZXI0LmJpbmQoaGFuZGxlcjQsIGVsLCBkaXJlY3RpdmUyLCB1dGlsaXRpZXMpO1xuICAgIGlzRGVmZXJyaW5nSGFuZGxlcnMgPyBkaXJlY3RpdmVIYW5kbGVyU3RhY2tzLmdldChjdXJyZW50SGFuZGxlclN0YWNrS2V5KS5wdXNoKGhhbmRsZXI0KSA6IGhhbmRsZXI0KCk7XG4gIH07XG4gIGZ1bGxIYW5kbGVyLnJ1bkNsZWFudXBzID0gY2xlYW51cDI7XG4gIHJldHVybiBmdWxsSGFuZGxlcjtcbn1cbnZhciBzdGFydGluZ1dpdGggPSAoc3ViamVjdCwgcmVwbGFjZW1lbnQpID0+ICh7IG5hbWUsIHZhbHVlIH0pID0+IHtcbiAgaWYgKG5hbWUuc3RhcnRzV2l0aChzdWJqZWN0KSlcbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKHN1YmplY3QsIHJlcGxhY2VtZW50KTtcbiAgcmV0dXJuIHsgbmFtZSwgdmFsdWUgfTtcbn07XG52YXIgaW50byA9IChpKSA9PiBpO1xuZnVuY3Rpb24gdG9UcmFuc2Zvcm1lZEF0dHJpYnV0ZXMoY2FsbGJhY2sgPSAoKSA9PiB7XG59KSB7XG4gIHJldHVybiAoeyBuYW1lLCB2YWx1ZSB9KSA9PiB7XG4gICAgbGV0IHsgbmFtZTogbmV3TmFtZSwgdmFsdWU6IG5ld1ZhbHVlIH0gPSBhdHRyaWJ1dGVUcmFuc2Zvcm1lcnMucmVkdWNlKChjYXJyeSwgdHJhbnNmb3JtKSA9PiB7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtKGNhcnJ5KTtcbiAgICB9LCB7IG5hbWUsIHZhbHVlIH0pO1xuICAgIGlmIChuZXdOYW1lICE9PSBuYW1lKVxuICAgICAgY2FsbGJhY2sobmV3TmFtZSwgbmFtZSk7XG4gICAgcmV0dXJuIHsgbmFtZTogbmV3TmFtZSwgdmFsdWU6IG5ld1ZhbHVlIH07XG4gIH07XG59XG52YXIgYXR0cmlidXRlVHJhbnNmb3JtZXJzID0gW107XG5mdW5jdGlvbiBtYXBBdHRyaWJ1dGVzKGNhbGxiYWNrKSB7XG4gIGF0dHJpYnV0ZVRyYW5zZm9ybWVycy5wdXNoKGNhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIG91dE5vbkFscGluZUF0dHJpYnV0ZXMoeyBuYW1lIH0pIHtcbiAgcmV0dXJuIGFscGluZUF0dHJpYnV0ZVJlZ2V4KCkudGVzdChuYW1lKTtcbn1cbnZhciBhbHBpbmVBdHRyaWJ1dGVSZWdleCA9ICgpID0+IG5ldyBSZWdFeHAoYF4ke3ByZWZpeEFzU3RyaW5nfShbXjpeLl0rKVxcXFxiYCk7XG5mdW5jdGlvbiB0b1BhcnNlZERpcmVjdGl2ZXModHJhbnNmb3JtZWRBdHRyaWJ1dGVNYXAsIG9yaWdpbmFsQXR0cmlidXRlT3ZlcnJpZGUpIHtcbiAgcmV0dXJuICh7IG5hbWUsIHZhbHVlIH0pID0+IHtcbiAgICBsZXQgdHlwZU1hdGNoID0gbmFtZS5tYXRjaChhbHBpbmVBdHRyaWJ1dGVSZWdleCgpKTtcbiAgICBsZXQgdmFsdWVNYXRjaCA9IG5hbWUubWF0Y2goLzooW2EtekEtWjAtOVxcLV86XSspLyk7XG4gICAgbGV0IG1vZGlmaWVycyA9IG5hbWUubWF0Y2goL1xcLlteLlxcXV0rKD89W15cXF1dKiQpL2cpIHx8IFtdO1xuICAgIGxldCBvcmlnaW5hbCA9IG9yaWdpbmFsQXR0cmlidXRlT3ZlcnJpZGUgfHwgdHJhbnNmb3JtZWRBdHRyaWJ1dGVNYXBbbmFtZV0gfHwgbmFtZTtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogdHlwZU1hdGNoID8gdHlwZU1hdGNoWzFdIDogbnVsbCxcbiAgICAgIHZhbHVlOiB2YWx1ZU1hdGNoID8gdmFsdWVNYXRjaFsxXSA6IG51bGwsXG4gICAgICBtb2RpZmllcnM6IG1vZGlmaWVycy5tYXAoKGkpID0+IGkucmVwbGFjZShcIi5cIiwgXCJcIikpLFxuICAgICAgZXhwcmVzc2lvbjogdmFsdWUsXG4gICAgICBvcmlnaW5hbFxuICAgIH07XG4gIH07XG59XG52YXIgREVGQVVMVCA9IFwiREVGQVVMVFwiO1xudmFyIGRpcmVjdGl2ZU9yZGVyID0gW1xuICBcImlnbm9yZVwiLFxuICBcInJlZlwiLFxuICBcImRhdGFcIixcbiAgXCJpZFwiLFxuICBcImFuY2hvclwiLFxuICBcImJpbmRcIixcbiAgXCJpbml0XCIsXG4gIFwiZm9yXCIsXG4gIFwibW9kZWxcIixcbiAgXCJtb2RlbGFibGVcIixcbiAgXCJ0cmFuc2l0aW9uXCIsXG4gIFwic2hvd1wiLFxuICBcImlmXCIsXG4gIERFRkFVTFQsXG4gIFwidGVsZXBvcnRcIlxuXTtcbmZ1bmN0aW9uIGJ5UHJpb3JpdHkoYSwgYikge1xuICBsZXQgdHlwZUEgPSBkaXJlY3RpdmVPcmRlci5pbmRleE9mKGEudHlwZSkgPT09IC0xID8gREVGQVVMVCA6IGEudHlwZTtcbiAgbGV0IHR5cGVCID0gZGlyZWN0aXZlT3JkZXIuaW5kZXhPZihiLnR5cGUpID09PSAtMSA/IERFRkFVTFQgOiBiLnR5cGU7XG4gIHJldHVybiBkaXJlY3RpdmVPcmRlci5pbmRleE9mKHR5cGVBKSAtIGRpcmVjdGl2ZU9yZGVyLmluZGV4T2YodHlwZUIpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvdXRpbHMvZGlzcGF0Y2guanNcbmZ1bmN0aW9uIGRpc3BhdGNoKGVsLCBuYW1lLCBkZXRhaWwgPSB7fSkge1xuICBlbC5kaXNwYXRjaEV2ZW50KFxuICAgIG5ldyBDdXN0b21FdmVudChuYW1lLCB7XG4gICAgICBkZXRhaWwsXG4gICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgLy8gQWxsb3dzIGV2ZW50cyB0byBwYXNzIHRoZSBzaGFkb3cgRE9NIGJhcnJpZXIuXG4gICAgICBjb21wb3NlZDogdHJ1ZSxcbiAgICAgIGNhbmNlbGFibGU6IHRydWVcbiAgICB9KVxuICApO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvdXRpbHMvd2Fsay5qc1xuZnVuY3Rpb24gd2FsayhlbCwgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBTaGFkb3dSb290ID09PSBcImZ1bmN0aW9uXCIgJiYgZWwgaW5zdGFuY2VvZiBTaGFkb3dSb290KSB7XG4gICAgQXJyYXkuZnJvbShlbC5jaGlsZHJlbikuZm9yRWFjaCgoZWwyKSA9PiB3YWxrKGVsMiwgY2FsbGJhY2spKTtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHNraXAgPSBmYWxzZTtcbiAgY2FsbGJhY2soZWwsICgpID0+IHNraXAgPSB0cnVlKTtcbiAgaWYgKHNraXApXG4gICAgcmV0dXJuO1xuICBsZXQgbm9kZSA9IGVsLmZpcnN0RWxlbWVudENoaWxkO1xuICB3aGlsZSAobm9kZSkge1xuICAgIHdhbGsobm9kZSwgY2FsbGJhY2ssIGZhbHNlKTtcbiAgICBub2RlID0gbm9kZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gIH1cbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3V0aWxzL3dhcm4uanNcbmZ1bmN0aW9uIHdhcm4obWVzc2FnZSwgLi4uYXJncykge1xuICBjb25zb2xlLndhcm4oYEFscGluZSBXYXJuaW5nOiAke21lc3NhZ2V9YCwgLi4uYXJncyk7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9saWZlY3ljbGUuanNcbnZhciBzdGFydGVkID0gZmFsc2U7XG5mdW5jdGlvbiBzdGFydCgpIHtcbiAgaWYgKHN0YXJ0ZWQpXG4gICAgd2FybihcIkFscGluZSBoYXMgYWxyZWFkeSBiZWVuIGluaXRpYWxpemVkIG9uIHRoaXMgcGFnZS4gQ2FsbGluZyBBbHBpbmUuc3RhcnQoKSBtb3JlIHRoYW4gb25jZSBjYW4gY2F1c2UgcHJvYmxlbXMuXCIpO1xuICBzdGFydGVkID0gdHJ1ZTtcbiAgaWYgKCFkb2N1bWVudC5ib2R5KVxuICAgIHdhcm4oXCJVbmFibGUgdG8gaW5pdGlhbGl6ZS4gVHJ5aW5nIHRvIGxvYWQgQWxwaW5lIGJlZm9yZSBgPGJvZHk+YCBpcyBhdmFpbGFibGUuIERpZCB5b3UgZm9yZ2V0IHRvIGFkZCBgZGVmZXJgIGluIEFscGluZSdzIGA8c2NyaXB0PmAgdGFnP1wiKTtcbiAgZGlzcGF0Y2goZG9jdW1lbnQsIFwiYWxwaW5lOmluaXRcIik7XG4gIGRpc3BhdGNoKGRvY3VtZW50LCBcImFscGluZTppbml0aWFsaXppbmdcIik7XG4gIHN0YXJ0T2JzZXJ2aW5nTXV0YXRpb25zKCk7XG4gIG9uRWxBZGRlZCgoZWwpID0+IGluaXRUcmVlKGVsLCB3YWxrKSk7XG4gIG9uRWxSZW1vdmVkKChlbCkgPT4gZGVzdHJveVRyZWUoZWwpKTtcbiAgb25BdHRyaWJ1dGVzQWRkZWQoKGVsLCBhdHRycykgPT4ge1xuICAgIGRpcmVjdGl2ZXMoZWwsIGF0dHJzKS5mb3JFYWNoKChoYW5kbGUpID0+IGhhbmRsZSgpKTtcbiAgfSk7XG4gIGxldCBvdXROZXN0ZWRDb21wb25lbnRzID0gKGVsKSA9PiAhY2xvc2VzdFJvb3QoZWwucGFyZW50RWxlbWVudCwgdHJ1ZSk7XG4gIEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChhbGxTZWxlY3RvcnMoKS5qb2luKFwiLFwiKSkpLmZpbHRlcihvdXROZXN0ZWRDb21wb25lbnRzKS5mb3JFYWNoKChlbCkgPT4ge1xuICAgIGluaXRUcmVlKGVsKTtcbiAgfSk7XG4gIGRpc3BhdGNoKGRvY3VtZW50LCBcImFscGluZTppbml0aWFsaXplZFwiKTtcbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgd2FybkFib3V0TWlzc2luZ1BsdWdpbnMoKTtcbiAgfSk7XG59XG52YXIgcm9vdFNlbGVjdG9yQ2FsbGJhY2tzID0gW107XG52YXIgaW5pdFNlbGVjdG9yQ2FsbGJhY2tzID0gW107XG5mdW5jdGlvbiByb290U2VsZWN0b3JzKCkge1xuICByZXR1cm4gcm9vdFNlbGVjdG9yQ2FsbGJhY2tzLm1hcCgoZm4pID0+IGZuKCkpO1xufVxuZnVuY3Rpb24gYWxsU2VsZWN0b3JzKCkge1xuICByZXR1cm4gcm9vdFNlbGVjdG9yQ2FsbGJhY2tzLmNvbmNhdChpbml0U2VsZWN0b3JDYWxsYmFja3MpLm1hcCgoZm4pID0+IGZuKCkpO1xufVxuZnVuY3Rpb24gYWRkUm9vdFNlbGVjdG9yKHNlbGVjdG9yQ2FsbGJhY2spIHtcbiAgcm9vdFNlbGVjdG9yQ2FsbGJhY2tzLnB1c2goc2VsZWN0b3JDYWxsYmFjayk7XG59XG5mdW5jdGlvbiBhZGRJbml0U2VsZWN0b3Ioc2VsZWN0b3JDYWxsYmFjaykge1xuICBpbml0U2VsZWN0b3JDYWxsYmFja3MucHVzaChzZWxlY3RvckNhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIGNsb3Nlc3RSb290KGVsLCBpbmNsdWRlSW5pdFNlbGVjdG9ycyA9IGZhbHNlKSB7XG4gIHJldHVybiBmaW5kQ2xvc2VzdChlbCwgKGVsZW1lbnQpID0+IHtcbiAgICBjb25zdCBzZWxlY3RvcnMgPSBpbmNsdWRlSW5pdFNlbGVjdG9ycyA/IGFsbFNlbGVjdG9ycygpIDogcm9vdFNlbGVjdG9ycygpO1xuICAgIGlmIChzZWxlY3RvcnMuc29tZSgoc2VsZWN0b3IpID0+IGVsZW1lbnQubWF0Y2hlcyhzZWxlY3RvcikpKVxuICAgICAgcmV0dXJuIHRydWU7XG4gIH0pO1xufVxuZnVuY3Rpb24gZmluZENsb3Nlc3QoZWwsIGNhbGxiYWNrKSB7XG4gIGlmICghZWwpXG4gICAgcmV0dXJuO1xuICBpZiAoY2FsbGJhY2soZWwpKVxuICAgIHJldHVybiBlbDtcbiAgaWYgKGVsLl94X3RlbGVwb3J0QmFjaylcbiAgICBlbCA9IGVsLl94X3RlbGVwb3J0QmFjaztcbiAgaWYgKCFlbC5wYXJlbnRFbGVtZW50KVxuICAgIHJldHVybjtcbiAgcmV0dXJuIGZpbmRDbG9zZXN0KGVsLnBhcmVudEVsZW1lbnQsIGNhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIGlzUm9vdChlbCkge1xuICByZXR1cm4gcm9vdFNlbGVjdG9ycygpLnNvbWUoKHNlbGVjdG9yKSA9PiBlbC5tYXRjaGVzKHNlbGVjdG9yKSk7XG59XG52YXIgaW5pdEludGVyY2VwdG9yczIgPSBbXTtcbmZ1bmN0aW9uIGludGVyY2VwdEluaXQoY2FsbGJhY2spIHtcbiAgaW5pdEludGVyY2VwdG9yczIucHVzaChjYWxsYmFjayk7XG59XG5mdW5jdGlvbiBpbml0VHJlZShlbCwgd2Fsa2VyID0gd2FsaywgaW50ZXJjZXB0ID0gKCkgPT4ge1xufSkge1xuICBkZWZlckhhbmRsaW5nRGlyZWN0aXZlcygoKSA9PiB7XG4gICAgd2Fsa2VyKGVsLCAoZWwyLCBza2lwKSA9PiB7XG4gICAgICBpbnRlcmNlcHQoZWwyLCBza2lwKTtcbiAgICAgIGluaXRJbnRlcmNlcHRvcnMyLmZvckVhY2goKGkpID0+IGkoZWwyLCBza2lwKSk7XG4gICAgICBkaXJlY3RpdmVzKGVsMiwgZWwyLmF0dHJpYnV0ZXMpLmZvckVhY2goKGhhbmRsZSkgPT4gaGFuZGxlKCkpO1xuICAgICAgZWwyLl94X2lnbm9yZSAmJiBza2lwKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gZGVzdHJveVRyZWUocm9vdCwgd2Fsa2VyID0gd2Fsaykge1xuICB3YWxrZXIocm9vdCwgKGVsKSA9PiB7XG4gICAgY2xlYW51cEF0dHJpYnV0ZXMoZWwpO1xuICAgIGNsZWFudXBFbGVtZW50KGVsKTtcbiAgfSk7XG59XG5mdW5jdGlvbiB3YXJuQWJvdXRNaXNzaW5nUGx1Z2lucygpIHtcbiAgbGV0IHBsdWdpbkRpcmVjdGl2ZXMgPSBbXG4gICAgW1widWlcIiwgXCJkaWFsb2dcIiwgW1wiW3gtZGlhbG9nXSwgW3gtcG9wb3Zlcl1cIl1dLFxuICAgIFtcImFuY2hvclwiLCBcImFuY2hvclwiLCBbXCJbeC1hbmNob3JdXCJdXSxcbiAgICBbXCJzb3J0XCIsIFwic29ydFwiLCBbXCJbeC1zb3J0XVwiXV1cbiAgXTtcbiAgcGx1Z2luRGlyZWN0aXZlcy5mb3JFYWNoKChbcGx1Z2luMiwgZGlyZWN0aXZlMiwgc2VsZWN0b3JzXSkgPT4ge1xuICAgIGlmIChkaXJlY3RpdmVFeGlzdHMoZGlyZWN0aXZlMikpXG4gICAgICByZXR1cm47XG4gICAgc2VsZWN0b3JzLnNvbWUoKHNlbGVjdG9yKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcikpIHtcbiAgICAgICAgd2FybihgZm91bmQgXCIke3NlbGVjdG9yfVwiLCBidXQgbWlzc2luZyAke3BsdWdpbjJ9IHBsdWdpbmApO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9uZXh0VGljay5qc1xudmFyIHRpY2tTdGFjayA9IFtdO1xudmFyIGlzSG9sZGluZyA9IGZhbHNlO1xuZnVuY3Rpb24gbmV4dFRpY2soY2FsbGJhY2sgPSAoKSA9PiB7XG59KSB7XG4gIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICBpc0hvbGRpbmcgfHwgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByZWxlYXNlTmV4dFRpY2tzKCk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlcykgPT4ge1xuICAgIHRpY2tTdGFjay5wdXNoKCgpID0+IHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgICByZXMoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5mdW5jdGlvbiByZWxlYXNlTmV4dFRpY2tzKCkge1xuICBpc0hvbGRpbmcgPSBmYWxzZTtcbiAgd2hpbGUgKHRpY2tTdGFjay5sZW5ndGgpXG4gICAgdGlja1N0YWNrLnNoaWZ0KCkoKTtcbn1cbmZ1bmN0aW9uIGhvbGROZXh0VGlja3MoKSB7XG4gIGlzSG9sZGluZyA9IHRydWU7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy91dGlscy9jbGFzc2VzLmpzXG5mdW5jdGlvbiBzZXRDbGFzc2VzKGVsLCB2YWx1ZSkge1xuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICByZXR1cm4gc2V0Q2xhc3Nlc0Zyb21TdHJpbmcoZWwsIHZhbHVlLmpvaW4oXCIgXCIpKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwpIHtcbiAgICByZXR1cm4gc2V0Q2xhc3Nlc0Zyb21PYmplY3QoZWwsIHZhbHVlKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiBzZXRDbGFzc2VzKGVsLCB2YWx1ZSgpKTtcbiAgfVxuICByZXR1cm4gc2V0Q2xhc3Nlc0Zyb21TdHJpbmcoZWwsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIHNldENsYXNzZXNGcm9tU3RyaW5nKGVsLCBjbGFzc1N0cmluZykge1xuICBsZXQgc3BsaXQgPSAoY2xhc3NTdHJpbmcyKSA9PiBjbGFzc1N0cmluZzIuc3BsaXQoXCIgXCIpLmZpbHRlcihCb29sZWFuKTtcbiAgbGV0IG1pc3NpbmdDbGFzc2VzID0gKGNsYXNzU3RyaW5nMikgPT4gY2xhc3NTdHJpbmcyLnNwbGl0KFwiIFwiKS5maWx0ZXIoKGkpID0+ICFlbC5jbGFzc0xpc3QuY29udGFpbnMoaSkpLmZpbHRlcihCb29sZWFuKTtcbiAgbGV0IGFkZENsYXNzZXNBbmRSZXR1cm5VbmRvID0gKGNsYXNzZXMpID0+IHtcbiAgICBlbC5jbGFzc0xpc3QuYWRkKC4uLmNsYXNzZXMpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKC4uLmNsYXNzZXMpO1xuICAgIH07XG4gIH07XG4gIGNsYXNzU3RyaW5nID0gY2xhc3NTdHJpbmcgPT09IHRydWUgPyBjbGFzc1N0cmluZyA9IFwiXCIgOiBjbGFzc1N0cmluZyB8fCBcIlwiO1xuICByZXR1cm4gYWRkQ2xhc3Nlc0FuZFJldHVyblVuZG8obWlzc2luZ0NsYXNzZXMoY2xhc3NTdHJpbmcpKTtcbn1cbmZ1bmN0aW9uIHNldENsYXNzZXNGcm9tT2JqZWN0KGVsLCBjbGFzc09iamVjdCkge1xuICBsZXQgc3BsaXQgPSAoY2xhc3NTdHJpbmcpID0+IGNsYXNzU3RyaW5nLnNwbGl0KFwiIFwiKS5maWx0ZXIoQm9vbGVhbik7XG4gIGxldCBmb3JBZGQgPSBPYmplY3QuZW50cmllcyhjbGFzc09iamVjdCkuZmxhdE1hcCgoW2NsYXNzU3RyaW5nLCBib29sXSkgPT4gYm9vbCA/IHNwbGl0KGNsYXNzU3RyaW5nKSA6IGZhbHNlKS5maWx0ZXIoQm9vbGVhbik7XG4gIGxldCBmb3JSZW1vdmUgPSBPYmplY3QuZW50cmllcyhjbGFzc09iamVjdCkuZmxhdE1hcCgoW2NsYXNzU3RyaW5nLCBib29sXSkgPT4gIWJvb2wgPyBzcGxpdChjbGFzc1N0cmluZykgOiBmYWxzZSkuZmlsdGVyKEJvb2xlYW4pO1xuICBsZXQgYWRkZWQgPSBbXTtcbiAgbGV0IHJlbW92ZWQgPSBbXTtcbiAgZm9yUmVtb3ZlLmZvckVhY2goKGkpID0+IHtcbiAgICBpZiAoZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGkpKSB7XG4gICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKGkpO1xuICAgICAgcmVtb3ZlZC5wdXNoKGkpO1xuICAgIH1cbiAgfSk7XG4gIGZvckFkZC5mb3JFYWNoKChpKSA9PiB7XG4gICAgaWYgKCFlbC5jbGFzc0xpc3QuY29udGFpbnMoaSkpIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5hZGQoaSk7XG4gICAgICBhZGRlZC5wdXNoKGkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgcmVtb3ZlZC5mb3JFYWNoKChpKSA9PiBlbC5jbGFzc0xpc3QuYWRkKGkpKTtcbiAgICBhZGRlZC5mb3JFYWNoKChpKSA9PiBlbC5jbGFzc0xpc3QucmVtb3ZlKGkpKTtcbiAgfTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3V0aWxzL3N0eWxlcy5qc1xuZnVuY3Rpb24gc2V0U3R5bGVzKGVsLCB2YWx1ZSkge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsKSB7XG4gICAgcmV0dXJuIHNldFN0eWxlc0Zyb21PYmplY3QoZWwsIHZhbHVlKTtcbiAgfVxuICByZXR1cm4gc2V0U3R5bGVzRnJvbVN0cmluZyhlbCwgdmFsdWUpO1xufVxuZnVuY3Rpb24gc2V0U3R5bGVzRnJvbU9iamVjdChlbCwgdmFsdWUpIHtcbiAgbGV0IHByZXZpb3VzU3R5bGVzID0ge307XG4gIE9iamVjdC5lbnRyaWVzKHZhbHVlKS5mb3JFYWNoKChba2V5LCB2YWx1ZTJdKSA9PiB7XG4gICAgcHJldmlvdXNTdHlsZXNba2V5XSA9IGVsLnN0eWxlW2tleV07XG4gICAgaWYgKCFrZXkuc3RhcnRzV2l0aChcIi0tXCIpKSB7XG4gICAgICBrZXkgPSBrZWJhYkNhc2Uoa2V5KTtcbiAgICB9XG4gICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoa2V5LCB2YWx1ZTIpO1xuICB9KTtcbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgaWYgKGVsLnN0eWxlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKFwic3R5bGVcIik7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuICgpID0+IHtcbiAgICBzZXRTdHlsZXMoZWwsIHByZXZpb3VzU3R5bGVzKTtcbiAgfTtcbn1cbmZ1bmN0aW9uIHNldFN0eWxlc0Zyb21TdHJpbmcoZWwsIHZhbHVlKSB7XG4gIGxldCBjYWNoZSA9IGVsLmdldEF0dHJpYnV0ZShcInN0eWxlXCIsIHZhbHVlKTtcbiAgZWwuc2V0QXR0cmlidXRlKFwic3R5bGVcIiwgdmFsdWUpO1xuICByZXR1cm4gKCkgPT4ge1xuICAgIGVsLnNldEF0dHJpYnV0ZShcInN0eWxlXCIsIGNhY2hlIHx8IFwiXCIpO1xuICB9O1xufVxuZnVuY3Rpb24ga2ViYWJDYXNlKHN1YmplY3QpIHtcbiAgcmV0dXJuIHN1YmplY3QucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMS0kMlwiKS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvdXRpbHMvb25jZS5qc1xuZnVuY3Rpb24gb25jZShjYWxsYmFjaywgZmFsbGJhY2sgPSAoKSA9PiB7XG59KSB7XG4gIGxldCBjYWxsZWQgPSBmYWxzZTtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIGlmICghY2FsbGVkKSB7XG4gICAgICBjYWxsZWQgPSB0cnVlO1xuICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZmFsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH07XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9kaXJlY3RpdmVzL3gtdHJhbnNpdGlvbi5qc1xuZGlyZWN0aXZlKFwidHJhbnNpdGlvblwiLCAoZWwsIHsgdmFsdWUsIG1vZGlmaWVycywgZXhwcmVzc2lvbiB9LCB7IGV2YWx1YXRlOiBldmFsdWF0ZTIgfSkgPT4ge1xuICBpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwiZnVuY3Rpb25cIilcbiAgICBleHByZXNzaW9uID0gZXZhbHVhdGUyKGV4cHJlc3Npb24pO1xuICBpZiAoZXhwcmVzc2lvbiA9PT0gZmFsc2UpXG4gICAgcmV0dXJuO1xuICBpZiAoIWV4cHJlc3Npb24gfHwgdHlwZW9mIGV4cHJlc3Npb24gPT09IFwiYm9vbGVhblwiKSB7XG4gICAgcmVnaXN0ZXJUcmFuc2l0aW9uc0Zyb21IZWxwZXIoZWwsIG1vZGlmaWVycywgdmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIHJlZ2lzdGVyVHJhbnNpdGlvbnNGcm9tQ2xhc3NTdHJpbmcoZWwsIGV4cHJlc3Npb24sIHZhbHVlKTtcbiAgfVxufSk7XG5mdW5jdGlvbiByZWdpc3RlclRyYW5zaXRpb25zRnJvbUNsYXNzU3RyaW5nKGVsLCBjbGFzc1N0cmluZywgc3RhZ2UpIHtcbiAgcmVnaXN0ZXJUcmFuc2l0aW9uT2JqZWN0KGVsLCBzZXRDbGFzc2VzLCBcIlwiKTtcbiAgbGV0IGRpcmVjdGl2ZVN0b3JhZ2VNYXAgPSB7XG4gICAgXCJlbnRlclwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5lbnRlci5kdXJpbmcgPSBjbGFzc2VzO1xuICAgIH0sXG4gICAgXCJlbnRlci1zdGFydFwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5lbnRlci5zdGFydCA9IGNsYXNzZXM7XG4gICAgfSxcbiAgICBcImVudGVyLWVuZFwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5lbnRlci5lbmQgPSBjbGFzc2VzO1xuICAgIH0sXG4gICAgXCJsZWF2ZVwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZS5kdXJpbmcgPSBjbGFzc2VzO1xuICAgIH0sXG4gICAgXCJsZWF2ZS1zdGFydFwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZS5zdGFydCA9IGNsYXNzZXM7XG4gICAgfSxcbiAgICBcImxlYXZlLWVuZFwiOiAoY2xhc3NlcykgPT4ge1xuICAgICAgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZS5lbmQgPSBjbGFzc2VzO1xuICAgIH1cbiAgfTtcbiAgZGlyZWN0aXZlU3RvcmFnZU1hcFtzdGFnZV0oY2xhc3NTdHJpbmcpO1xufVxuZnVuY3Rpb24gcmVnaXN0ZXJUcmFuc2l0aW9uc0Zyb21IZWxwZXIoZWwsIG1vZGlmaWVycywgc3RhZ2UpIHtcbiAgcmVnaXN0ZXJUcmFuc2l0aW9uT2JqZWN0KGVsLCBzZXRTdHlsZXMpO1xuICBsZXQgZG9lc250U3BlY2lmeSA9ICFtb2RpZmllcnMuaW5jbHVkZXMoXCJpblwiKSAmJiAhbW9kaWZpZXJzLmluY2x1ZGVzKFwib3V0XCIpICYmICFzdGFnZTtcbiAgbGV0IHRyYW5zaXRpb25pbmdJbiA9IGRvZXNudFNwZWNpZnkgfHwgbW9kaWZpZXJzLmluY2x1ZGVzKFwiaW5cIikgfHwgW1wiZW50ZXJcIl0uaW5jbHVkZXMoc3RhZ2UpO1xuICBsZXQgdHJhbnNpdGlvbmluZ091dCA9IGRvZXNudFNwZWNpZnkgfHwgbW9kaWZpZXJzLmluY2x1ZGVzKFwib3V0XCIpIHx8IFtcImxlYXZlXCJdLmluY2x1ZGVzKHN0YWdlKTtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImluXCIpICYmICFkb2VzbnRTcGVjaWZ5KSB7XG4gICAgbW9kaWZpZXJzID0gbW9kaWZpZXJzLmZpbHRlcigoaSwgaW5kZXgpID0+IGluZGV4IDwgbW9kaWZpZXJzLmluZGV4T2YoXCJvdXRcIikpO1xuICB9XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJvdXRcIikgJiYgIWRvZXNudFNwZWNpZnkpIHtcbiAgICBtb2RpZmllcnMgPSBtb2RpZmllcnMuZmlsdGVyKChpLCBpbmRleCkgPT4gaW5kZXggPiBtb2RpZmllcnMuaW5kZXhPZihcIm91dFwiKSk7XG4gIH1cbiAgbGV0IHdhbnRzQWxsID0gIW1vZGlmaWVycy5pbmNsdWRlcyhcIm9wYWNpdHlcIikgJiYgIW1vZGlmaWVycy5pbmNsdWRlcyhcInNjYWxlXCIpO1xuICBsZXQgd2FudHNPcGFjaXR5ID0gd2FudHNBbGwgfHwgbW9kaWZpZXJzLmluY2x1ZGVzKFwib3BhY2l0eVwiKTtcbiAgbGV0IHdhbnRzU2NhbGUgPSB3YW50c0FsbCB8fCBtb2RpZmllcnMuaW5jbHVkZXMoXCJzY2FsZVwiKTtcbiAgbGV0IG9wYWNpdHlWYWx1ZSA9IHdhbnRzT3BhY2l0eSA/IDAgOiAxO1xuICBsZXQgc2NhbGVWYWx1ZSA9IHdhbnRzU2NhbGUgPyBtb2RpZmllclZhbHVlKG1vZGlmaWVycywgXCJzY2FsZVwiLCA5NSkgLyAxMDAgOiAxO1xuICBsZXQgZGVsYXkgPSBtb2RpZmllclZhbHVlKG1vZGlmaWVycywgXCJkZWxheVwiLCAwKSAvIDFlMztcbiAgbGV0IG9yaWdpbiA9IG1vZGlmaWVyVmFsdWUobW9kaWZpZXJzLCBcIm9yaWdpblwiLCBcImNlbnRlclwiKTtcbiAgbGV0IHByb3BlcnR5ID0gXCJvcGFjaXR5LCB0cmFuc2Zvcm1cIjtcbiAgbGV0IGR1cmF0aW9uSW4gPSBtb2RpZmllclZhbHVlKG1vZGlmaWVycywgXCJkdXJhdGlvblwiLCAxNTApIC8gMWUzO1xuICBsZXQgZHVyYXRpb25PdXQgPSBtb2RpZmllclZhbHVlKG1vZGlmaWVycywgXCJkdXJhdGlvblwiLCA3NSkgLyAxZTM7XG4gIGxldCBlYXNpbmcgPSBgY3ViaWMtYmV6aWVyKDAuNCwgMC4wLCAwLjIsIDEpYDtcbiAgaWYgKHRyYW5zaXRpb25pbmdJbikge1xuICAgIGVsLl94X3RyYW5zaXRpb24uZW50ZXIuZHVyaW5nID0ge1xuICAgICAgdHJhbnNmb3JtT3JpZ2luOiBvcmlnaW4sXG4gICAgICB0cmFuc2l0aW9uRGVsYXk6IGAke2RlbGF5fXNgLFxuICAgICAgdHJhbnNpdGlvblByb3BlcnR5OiBwcm9wZXJ0eSxcbiAgICAgIHRyYW5zaXRpb25EdXJhdGlvbjogYCR7ZHVyYXRpb25Jbn1zYCxcbiAgICAgIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZWFzaW5nXG4gICAgfTtcbiAgICBlbC5feF90cmFuc2l0aW9uLmVudGVyLnN0YXJ0ID0ge1xuICAgICAgb3BhY2l0eTogb3BhY2l0eVZhbHVlLFxuICAgICAgdHJhbnNmb3JtOiBgc2NhbGUoJHtzY2FsZVZhbHVlfSlgXG4gICAgfTtcbiAgICBlbC5feF90cmFuc2l0aW9uLmVudGVyLmVuZCA9IHtcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICB0cmFuc2Zvcm06IGBzY2FsZSgxKWBcbiAgICB9O1xuICB9XG4gIGlmICh0cmFuc2l0aW9uaW5nT3V0KSB7XG4gICAgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZS5kdXJpbmcgPSB7XG4gICAgICB0cmFuc2Zvcm1PcmlnaW46IG9yaWdpbixcbiAgICAgIHRyYW5zaXRpb25EZWxheTogYCR7ZGVsYXl9c2AsXG4gICAgICB0cmFuc2l0aW9uUHJvcGVydHk6IHByb3BlcnR5LFxuICAgICAgdHJhbnNpdGlvbkR1cmF0aW9uOiBgJHtkdXJhdGlvbk91dH1zYCxcbiAgICAgIHRyYW5zaXRpb25UaW1pbmdGdW5jdGlvbjogZWFzaW5nXG4gICAgfTtcbiAgICBlbC5feF90cmFuc2l0aW9uLmxlYXZlLnN0YXJ0ID0ge1xuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIHRyYW5zZm9ybTogYHNjYWxlKDEpYFxuICAgIH07XG4gICAgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZS5lbmQgPSB7XG4gICAgICBvcGFjaXR5OiBvcGFjaXR5VmFsdWUsXG4gICAgICB0cmFuc2Zvcm06IGBzY2FsZSgke3NjYWxlVmFsdWV9KWBcbiAgICB9O1xuICB9XG59XG5mdW5jdGlvbiByZWdpc3RlclRyYW5zaXRpb25PYmplY3QoZWwsIHNldEZ1bmN0aW9uLCBkZWZhdWx0VmFsdWUgPSB7fSkge1xuICBpZiAoIWVsLl94X3RyYW5zaXRpb24pXG4gICAgZWwuX3hfdHJhbnNpdGlvbiA9IHtcbiAgICAgIGVudGVyOiB7IGR1cmluZzogZGVmYXVsdFZhbHVlLCBzdGFydDogZGVmYXVsdFZhbHVlLCBlbmQ6IGRlZmF1bHRWYWx1ZSB9LFxuICAgICAgbGVhdmU6IHsgZHVyaW5nOiBkZWZhdWx0VmFsdWUsIHN0YXJ0OiBkZWZhdWx0VmFsdWUsIGVuZDogZGVmYXVsdFZhbHVlIH0sXG4gICAgICBpbihiZWZvcmUgPSAoKSA9PiB7XG4gICAgICB9LCBhZnRlciA9ICgpID0+IHtcbiAgICAgIH0pIHtcbiAgICAgICAgdHJhbnNpdGlvbihlbCwgc2V0RnVuY3Rpb24sIHtcbiAgICAgICAgICBkdXJpbmc6IHRoaXMuZW50ZXIuZHVyaW5nLFxuICAgICAgICAgIHN0YXJ0OiB0aGlzLmVudGVyLnN0YXJ0LFxuICAgICAgICAgIGVuZDogdGhpcy5lbnRlci5lbmRcbiAgICAgICAgfSwgYmVmb3JlLCBhZnRlcik7XG4gICAgICB9LFxuICAgICAgb3V0KGJlZm9yZSA9ICgpID0+IHtcbiAgICAgIH0sIGFmdGVyID0gKCkgPT4ge1xuICAgICAgfSkge1xuICAgICAgICB0cmFuc2l0aW9uKGVsLCBzZXRGdW5jdGlvbiwge1xuICAgICAgICAgIGR1cmluZzogdGhpcy5sZWF2ZS5kdXJpbmcsXG4gICAgICAgICAgc3RhcnQ6IHRoaXMubGVhdmUuc3RhcnQsXG4gICAgICAgICAgZW5kOiB0aGlzLmxlYXZlLmVuZFxuICAgICAgICB9LCBiZWZvcmUsIGFmdGVyKTtcbiAgICAgIH1cbiAgICB9O1xufVxud2luZG93LkVsZW1lbnQucHJvdG90eXBlLl94X3RvZ2dsZUFuZENhc2NhZGVXaXRoVHJhbnNpdGlvbnMgPSBmdW5jdGlvbihlbCwgdmFsdWUsIHNob3csIGhpZGUpIHtcbiAgY29uc3QgbmV4dFRpY2syID0gZG9jdW1lbnQudmlzaWJpbGl0eVN0YXRlID09PSBcInZpc2libGVcIiA/IHJlcXVlc3RBbmltYXRpb25GcmFtZSA6IHNldFRpbWVvdXQ7XG4gIGxldCBjbGlja0F3YXlDb21wYXRpYmxlU2hvdyA9ICgpID0+IG5leHRUaWNrMihzaG93KTtcbiAgaWYgKHZhbHVlKSB7XG4gICAgaWYgKGVsLl94X3RyYW5zaXRpb24gJiYgKGVsLl94X3RyYW5zaXRpb24uZW50ZXIgfHwgZWwuX3hfdHJhbnNpdGlvbi5sZWF2ZSkpIHtcbiAgICAgIGVsLl94X3RyYW5zaXRpb24uZW50ZXIgJiYgKE9iamVjdC5lbnRyaWVzKGVsLl94X3RyYW5zaXRpb24uZW50ZXIuZHVyaW5nKS5sZW5ndGggfHwgT2JqZWN0LmVudHJpZXMoZWwuX3hfdHJhbnNpdGlvbi5lbnRlci5zdGFydCkubGVuZ3RoIHx8IE9iamVjdC5lbnRyaWVzKGVsLl94X3RyYW5zaXRpb24uZW50ZXIuZW5kKS5sZW5ndGgpID8gZWwuX3hfdHJhbnNpdGlvbi5pbihzaG93KSA6IGNsaWNrQXdheUNvbXBhdGlibGVTaG93KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLl94X3RyYW5zaXRpb24gPyBlbC5feF90cmFuc2l0aW9uLmluKHNob3cpIDogY2xpY2tBd2F5Q29tcGF0aWJsZVNob3coKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG4gIGVsLl94X2hpZGVQcm9taXNlID0gZWwuX3hfdHJhbnNpdGlvbiA/IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBlbC5feF90cmFuc2l0aW9uLm91dCgoKSA9PiB7XG4gICAgfSwgKCkgPT4gcmVzb2x2ZShoaWRlKSk7XG4gICAgZWwuX3hfdHJhbnNpdGlvbmluZyAmJiBlbC5feF90cmFuc2l0aW9uaW5nLmJlZm9yZUNhbmNlbCgoKSA9PiByZWplY3QoeyBpc0Zyb21DYW5jZWxsZWRUcmFuc2l0aW9uOiB0cnVlIH0pKTtcbiAgfSkgOiBQcm9taXNlLnJlc29sdmUoaGlkZSk7XG4gIHF1ZXVlTWljcm90YXNrKCgpID0+IHtcbiAgICBsZXQgY2xvc2VzdCA9IGNsb3Nlc3RIaWRlKGVsKTtcbiAgICBpZiAoY2xvc2VzdCkge1xuICAgICAgaWYgKCFjbG9zZXN0Ll94X2hpZGVDaGlsZHJlbilcbiAgICAgICAgY2xvc2VzdC5feF9oaWRlQ2hpbGRyZW4gPSBbXTtcbiAgICAgIGNsb3Nlc3QuX3hfaGlkZUNoaWxkcmVuLnB1c2goZWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXh0VGljazIoKCkgPT4ge1xuICAgICAgICBsZXQgaGlkZUFmdGVyQ2hpbGRyZW4gPSAoZWwyKSA9PiB7XG4gICAgICAgICAgbGV0IGNhcnJ5ID0gUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgZWwyLl94X2hpZGVQcm9taXNlLFxuICAgICAgICAgICAgLi4uKGVsMi5feF9oaWRlQ2hpbGRyZW4gfHwgW10pLm1hcChoaWRlQWZ0ZXJDaGlsZHJlbilcbiAgICAgICAgICBdKS50aGVuKChbaV0pID0+IGk/LigpKTtcbiAgICAgICAgICBkZWxldGUgZWwyLl94X2hpZGVQcm9taXNlO1xuICAgICAgICAgIGRlbGV0ZSBlbDIuX3hfaGlkZUNoaWxkcmVuO1xuICAgICAgICAgIHJldHVybiBjYXJyeTtcbiAgICAgICAgfTtcbiAgICAgICAgaGlkZUFmdGVyQ2hpbGRyZW4oZWwpLmNhdGNoKChlKSA9PiB7XG4gICAgICAgICAgaWYgKCFlLmlzRnJvbUNhbmNlbGxlZFRyYW5zaXRpb24pXG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG59O1xuZnVuY3Rpb24gY2xvc2VzdEhpZGUoZWwpIHtcbiAgbGV0IHBhcmVudCA9IGVsLnBhcmVudE5vZGU7XG4gIGlmICghcGFyZW50KVxuICAgIHJldHVybjtcbiAgcmV0dXJuIHBhcmVudC5feF9oaWRlUHJvbWlzZSA/IHBhcmVudCA6IGNsb3Nlc3RIaWRlKHBhcmVudCk7XG59XG5mdW5jdGlvbiB0cmFuc2l0aW9uKGVsLCBzZXRGdW5jdGlvbiwgeyBkdXJpbmcsIHN0YXJ0OiBzdGFydDIsIGVuZCB9ID0ge30sIGJlZm9yZSA9ICgpID0+IHtcbn0sIGFmdGVyID0gKCkgPT4ge1xufSkge1xuICBpZiAoZWwuX3hfdHJhbnNpdGlvbmluZylcbiAgICBlbC5feF90cmFuc2l0aW9uaW5nLmNhbmNlbCgpO1xuICBpZiAoT2JqZWN0LmtleXMoZHVyaW5nKS5sZW5ndGggPT09IDAgJiYgT2JqZWN0LmtleXMoc3RhcnQyKS5sZW5ndGggPT09IDAgJiYgT2JqZWN0LmtleXMoZW5kKS5sZW5ndGggPT09IDApIHtcbiAgICBiZWZvcmUoKTtcbiAgICBhZnRlcigpO1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgdW5kb1N0YXJ0LCB1bmRvRHVyaW5nLCB1bmRvRW5kO1xuICBwZXJmb3JtVHJhbnNpdGlvbihlbCwge1xuICAgIHN0YXJ0KCkge1xuICAgICAgdW5kb1N0YXJ0ID0gc2V0RnVuY3Rpb24oZWwsIHN0YXJ0Mik7XG4gICAgfSxcbiAgICBkdXJpbmcoKSB7XG4gICAgICB1bmRvRHVyaW5nID0gc2V0RnVuY3Rpb24oZWwsIGR1cmluZyk7XG4gICAgfSxcbiAgICBiZWZvcmUsXG4gICAgZW5kKCkge1xuICAgICAgdW5kb1N0YXJ0KCk7XG4gICAgICB1bmRvRW5kID0gc2V0RnVuY3Rpb24oZWwsIGVuZCk7XG4gICAgfSxcbiAgICBhZnRlcixcbiAgICBjbGVhbnVwKCkge1xuICAgICAgdW5kb0R1cmluZygpO1xuICAgICAgdW5kb0VuZCgpO1xuICAgIH1cbiAgfSk7XG59XG5mdW5jdGlvbiBwZXJmb3JtVHJhbnNpdGlvbihlbCwgc3RhZ2VzKSB7XG4gIGxldCBpbnRlcnJ1cHRlZCwgcmVhY2hlZEJlZm9yZSwgcmVhY2hlZEVuZDtcbiAgbGV0IGZpbmlzaCA9IG9uY2UoKCkgPT4ge1xuICAgIG11dGF0ZURvbSgoKSA9PiB7XG4gICAgICBpbnRlcnJ1cHRlZCA9IHRydWU7XG4gICAgICBpZiAoIXJlYWNoZWRCZWZvcmUpXG4gICAgICAgIHN0YWdlcy5iZWZvcmUoKTtcbiAgICAgIGlmICghcmVhY2hlZEVuZCkge1xuICAgICAgICBzdGFnZXMuZW5kKCk7XG4gICAgICAgIHJlbGVhc2VOZXh0VGlja3MoKTtcbiAgICAgIH1cbiAgICAgIHN0YWdlcy5hZnRlcigpO1xuICAgICAgaWYgKGVsLmlzQ29ubmVjdGVkKVxuICAgICAgICBzdGFnZXMuY2xlYW51cCgpO1xuICAgICAgZGVsZXRlIGVsLl94X3RyYW5zaXRpb25pbmc7XG4gICAgfSk7XG4gIH0pO1xuICBlbC5feF90cmFuc2l0aW9uaW5nID0ge1xuICAgIGJlZm9yZUNhbmNlbHM6IFtdLFxuICAgIGJlZm9yZUNhbmNlbChjYWxsYmFjaykge1xuICAgICAgdGhpcy5iZWZvcmVDYW5jZWxzLnB1c2goY2FsbGJhY2spO1xuICAgIH0sXG4gICAgY2FuY2VsOiBvbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgd2hpbGUgKHRoaXMuYmVmb3JlQ2FuY2Vscy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5iZWZvcmVDYW5jZWxzLnNoaWZ0KCkoKTtcbiAgICAgIH1cbiAgICAgIDtcbiAgICAgIGZpbmlzaCgpO1xuICAgIH0pLFxuICAgIGZpbmlzaFxuICB9O1xuICBtdXRhdGVEb20oKCkgPT4ge1xuICAgIHN0YWdlcy5zdGFydCgpO1xuICAgIHN0YWdlcy5kdXJpbmcoKTtcbiAgfSk7XG4gIGhvbGROZXh0VGlja3MoKTtcbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICBpZiAoaW50ZXJydXB0ZWQpXG4gICAgICByZXR1cm47XG4gICAgbGV0IGR1cmF0aW9uID0gTnVtYmVyKGdldENvbXB1dGVkU3R5bGUoZWwpLnRyYW5zaXRpb25EdXJhdGlvbi5yZXBsYWNlKC8sLiovLCBcIlwiKS5yZXBsYWNlKFwic1wiLCBcIlwiKSkgKiAxZTM7XG4gICAgbGV0IGRlbGF5ID0gTnVtYmVyKGdldENvbXB1dGVkU3R5bGUoZWwpLnRyYW5zaXRpb25EZWxheS5yZXBsYWNlKC8sLiovLCBcIlwiKS5yZXBsYWNlKFwic1wiLCBcIlwiKSkgKiAxZTM7XG4gICAgaWYgKGR1cmF0aW9uID09PSAwKVxuICAgICAgZHVyYXRpb24gPSBOdW1iZXIoZ2V0Q29tcHV0ZWRTdHlsZShlbCkuYW5pbWF0aW9uRHVyYXRpb24ucmVwbGFjZShcInNcIiwgXCJcIikpICogMWUzO1xuICAgIG11dGF0ZURvbSgoKSA9PiB7XG4gICAgICBzdGFnZXMuYmVmb3JlKCk7XG4gICAgfSk7XG4gICAgcmVhY2hlZEJlZm9yZSA9IHRydWU7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGlmIChpbnRlcnJ1cHRlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgICAgc3RhZ2VzLmVuZCgpO1xuICAgICAgfSk7XG4gICAgICByZWxlYXNlTmV4dFRpY2tzKCk7XG4gICAgICBzZXRUaW1lb3V0KGVsLl94X3RyYW5zaXRpb25pbmcuZmluaXNoLCBkdXJhdGlvbiArIGRlbGF5KTtcbiAgICAgIHJlYWNoZWRFbmQgPSB0cnVlO1xuICAgIH0pO1xuICB9KTtcbn1cbmZ1bmN0aW9uIG1vZGlmaWVyVmFsdWUobW9kaWZpZXJzLCBrZXksIGZhbGxiYWNrKSB7XG4gIGlmIChtb2RpZmllcnMuaW5kZXhPZihrZXkpID09PSAtMSlcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIGNvbnN0IHJhd1ZhbHVlID0gbW9kaWZpZXJzW21vZGlmaWVycy5pbmRleE9mKGtleSkgKyAxXTtcbiAgaWYgKCFyYXdWYWx1ZSlcbiAgICByZXR1cm4gZmFsbGJhY2s7XG4gIGlmIChrZXkgPT09IFwic2NhbGVcIikge1xuICAgIGlmIChpc05hTihyYXdWYWx1ZSkpXG4gICAgICByZXR1cm4gZmFsbGJhY2s7XG4gIH1cbiAgaWYgKGtleSA9PT0gXCJkdXJhdGlvblwiIHx8IGtleSA9PT0gXCJkZWxheVwiKSB7XG4gICAgbGV0IG1hdGNoID0gcmF3VmFsdWUubWF0Y2goLyhbMC05XSspbXMvKTtcbiAgICBpZiAobWF0Y2gpXG4gICAgICByZXR1cm4gbWF0Y2hbMV07XG4gIH1cbiAgaWYgKGtleSA9PT0gXCJvcmlnaW5cIikge1xuICAgIGlmIChbXCJ0b3BcIiwgXCJyaWdodFwiLCBcImxlZnRcIiwgXCJjZW50ZXJcIiwgXCJib3R0b21cIl0uaW5jbHVkZXMobW9kaWZpZXJzW21vZGlmaWVycy5pbmRleE9mKGtleSkgKyAyXSkpIHtcbiAgICAgIHJldHVybiBbcmF3VmFsdWUsIG1vZGlmaWVyc1ttb2RpZmllcnMuaW5kZXhPZihrZXkpICsgMl1dLmpvaW4oXCIgXCIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmF3VmFsdWU7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9jbG9uZS5qc1xudmFyIGlzQ2xvbmluZyA9IGZhbHNlO1xuZnVuY3Rpb24gc2tpcER1cmluZ0Nsb25lKGNhbGxiYWNrLCBmYWxsYmFjayA9ICgpID0+IHtcbn0pIHtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiBpc0Nsb25pbmcgPyBmYWxsYmFjayguLi5hcmdzKSA6IGNhbGxiYWNrKC4uLmFyZ3MpO1xufVxuZnVuY3Rpb24gb25seUR1cmluZ0Nsb25lKGNhbGxiYWNrKSB7XG4gIHJldHVybiAoLi4uYXJncykgPT4gaXNDbG9uaW5nICYmIGNhbGxiYWNrKC4uLmFyZ3MpO1xufVxudmFyIGludGVyY2VwdG9ycyA9IFtdO1xuZnVuY3Rpb24gaW50ZXJjZXB0Q2xvbmUoY2FsbGJhY2spIHtcbiAgaW50ZXJjZXB0b3JzLnB1c2goY2FsbGJhY2spO1xufVxuZnVuY3Rpb24gY2xvbmVOb2RlKGZyb20sIHRvKSB7XG4gIGludGVyY2VwdG9ycy5mb3JFYWNoKChpKSA9PiBpKGZyb20sIHRvKSk7XG4gIGlzQ2xvbmluZyA9IHRydWU7XG4gIGRvbnRSZWdpc3RlclJlYWN0aXZlU2lkZUVmZmVjdHMoKCkgPT4ge1xuICAgIGluaXRUcmVlKHRvLCAoZWwsIGNhbGxiYWNrKSA9PiB7XG4gICAgICBjYWxsYmFjayhlbCwgKCkgPT4ge1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuICBpc0Nsb25pbmcgPSBmYWxzZTtcbn1cbnZhciBpc0Nsb25pbmdMZWdhY3kgPSBmYWxzZTtcbmZ1bmN0aW9uIGNsb25lKG9sZEVsLCBuZXdFbCkge1xuICBpZiAoIW5ld0VsLl94X2RhdGFTdGFjaylcbiAgICBuZXdFbC5feF9kYXRhU3RhY2sgPSBvbGRFbC5feF9kYXRhU3RhY2s7XG4gIGlzQ2xvbmluZyA9IHRydWU7XG4gIGlzQ2xvbmluZ0xlZ2FjeSA9IHRydWU7XG4gIGRvbnRSZWdpc3RlclJlYWN0aXZlU2lkZUVmZmVjdHMoKCkgPT4ge1xuICAgIGNsb25lVHJlZShuZXdFbCk7XG4gIH0pO1xuICBpc0Nsb25pbmcgPSBmYWxzZTtcbiAgaXNDbG9uaW5nTGVnYWN5ID0gZmFsc2U7XG59XG5mdW5jdGlvbiBjbG9uZVRyZWUoZWwpIHtcbiAgbGV0IGhhc1J1blRocm91Z2hGaXJzdEVsID0gZmFsc2U7XG4gIGxldCBzaGFsbG93V2Fsa2VyID0gKGVsMiwgY2FsbGJhY2spID0+IHtcbiAgICB3YWxrKGVsMiwgKGVsMywgc2tpcCkgPT4ge1xuICAgICAgaWYgKGhhc1J1blRocm91Z2hGaXJzdEVsICYmIGlzUm9vdChlbDMpKVxuICAgICAgICByZXR1cm4gc2tpcCgpO1xuICAgICAgaGFzUnVuVGhyb3VnaEZpcnN0RWwgPSB0cnVlO1xuICAgICAgY2FsbGJhY2soZWwzLCBza2lwKTtcbiAgICB9KTtcbiAgfTtcbiAgaW5pdFRyZWUoZWwsIHNoYWxsb3dXYWxrZXIpO1xufVxuZnVuY3Rpb24gZG9udFJlZ2lzdGVyUmVhY3RpdmVTaWRlRWZmZWN0cyhjYWxsYmFjaykge1xuICBsZXQgY2FjaGUgPSBlZmZlY3Q7XG4gIG92ZXJyaWRlRWZmZWN0KChjYWxsYmFjazIsIGVsKSA9PiB7XG4gICAgbGV0IHN0b3JlZEVmZmVjdCA9IGNhY2hlKGNhbGxiYWNrMik7XG4gICAgcmVsZWFzZShzdG9yZWRFZmZlY3QpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgfTtcbiAgfSk7XG4gIGNhbGxiYWNrKCk7XG4gIG92ZXJyaWRlRWZmZWN0KGNhY2hlKTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3V0aWxzL2JpbmQuanNcbmZ1bmN0aW9uIGJpbmQoZWwsIG5hbWUsIHZhbHVlLCBtb2RpZmllcnMgPSBbXSkge1xuICBpZiAoIWVsLl94X2JpbmRpbmdzKVxuICAgIGVsLl94X2JpbmRpbmdzID0gcmVhY3RpdmUoe30pO1xuICBlbC5feF9iaW5kaW5nc1tuYW1lXSA9IHZhbHVlO1xuICBuYW1lID0gbW9kaWZpZXJzLmluY2x1ZGVzKFwiY2FtZWxcIikgPyBjYW1lbENhc2UobmFtZSkgOiBuYW1lO1xuICBzd2l0Y2ggKG5hbWUpIHtcbiAgICBjYXNlIFwidmFsdWVcIjpcbiAgICAgIGJpbmRJbnB1dFZhbHVlKGVsLCB2YWx1ZSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIFwic3R5bGVcIjpcbiAgICAgIGJpbmRTdHlsZXMoZWwsIHZhbHVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJjbGFzc1wiOlxuICAgICAgYmluZENsYXNzZXMoZWwsIHZhbHVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgXCJzZWxlY3RlZFwiOlxuICAgIGNhc2UgXCJjaGVja2VkXCI6XG4gICAgICBiaW5kQXR0cmlidXRlQW5kUHJvcGVydHkoZWwsIG5hbWUsIHZhbHVlKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBiaW5kQXR0cmlidXRlKGVsLCBuYW1lLCB2YWx1ZSk7XG4gICAgICBicmVhaztcbiAgfVxufVxuZnVuY3Rpb24gYmluZElucHV0VmFsdWUoZWwsIHZhbHVlKSB7XG4gIGlmIChlbC50eXBlID09PSBcInJhZGlvXCIpIHtcbiAgICBpZiAoZWwuYXR0cmlidXRlcy52YWx1ZSA9PT0gdm9pZCAwKSB7XG4gICAgICBlbC52YWx1ZSA9IHZhbHVlO1xuICAgIH1cbiAgICBpZiAod2luZG93LmZyb21Nb2RlbCkge1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgICAgZWwuY2hlY2tlZCA9IHNhZmVQYXJzZUJvb2xlYW4oZWwudmFsdWUpID09PSB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLmNoZWNrZWQgPSBjaGVja2VkQXR0ckxvb3NlQ29tcGFyZShlbC52YWx1ZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIGlmIChlbC50eXBlID09PSBcImNoZWNrYm94XCIpIHtcbiAgICBpZiAoTnVtYmVyLmlzSW50ZWdlcih2YWx1ZSkpIHtcbiAgICAgIGVsLnZhbHVlID0gdmFsdWU7XG4gICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgdHlwZW9mIHZhbHVlICE9PSBcImJvb2xlYW5cIiAmJiAhW251bGwsIHZvaWQgMF0uaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICBlbC52YWx1ZSA9IFN0cmluZyh2YWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICBlbC5jaGVja2VkID0gdmFsdWUuc29tZSgodmFsKSA9PiBjaGVja2VkQXR0ckxvb3NlQ29tcGFyZSh2YWwsIGVsLnZhbHVlKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbC5jaGVja2VkID0gISF2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSBpZiAoZWwudGFnTmFtZSA9PT0gXCJTRUxFQ1RcIikge1xuICAgIHVwZGF0ZVNlbGVjdChlbCwgdmFsdWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChlbC52YWx1ZSA9PT0gdmFsdWUpXG4gICAgICByZXR1cm47XG4gICAgZWwudmFsdWUgPSB2YWx1ZSA9PT0gdm9pZCAwID8gXCJcIiA6IHZhbHVlO1xuICB9XG59XG5mdW5jdGlvbiBiaW5kQ2xhc3NlcyhlbCwgdmFsdWUpIHtcbiAgaWYgKGVsLl94X3VuZG9BZGRlZENsYXNzZXMpXG4gICAgZWwuX3hfdW5kb0FkZGVkQ2xhc3NlcygpO1xuICBlbC5feF91bmRvQWRkZWRDbGFzc2VzID0gc2V0Q2xhc3NlcyhlbCwgdmFsdWUpO1xufVxuZnVuY3Rpb24gYmluZFN0eWxlcyhlbCwgdmFsdWUpIHtcbiAgaWYgKGVsLl94X3VuZG9BZGRlZFN0eWxlcylcbiAgICBlbC5feF91bmRvQWRkZWRTdHlsZXMoKTtcbiAgZWwuX3hfdW5kb0FkZGVkU3R5bGVzID0gc2V0U3R5bGVzKGVsLCB2YWx1ZSk7XG59XG5mdW5jdGlvbiBiaW5kQXR0cmlidXRlQW5kUHJvcGVydHkoZWwsIG5hbWUsIHZhbHVlKSB7XG4gIGJpbmRBdHRyaWJ1dGUoZWwsIG5hbWUsIHZhbHVlKTtcbiAgc2V0UHJvcGVydHlJZkNoYW5nZWQoZWwsIG5hbWUsIHZhbHVlKTtcbn1cbmZ1bmN0aW9uIGJpbmRBdHRyaWJ1dGUoZWwsIG5hbWUsIHZhbHVlKSB7XG4gIGlmIChbbnVsbCwgdm9pZCAwLCBmYWxzZV0uaW5jbHVkZXModmFsdWUpICYmIGF0dHJpYnV0ZVNob3VsZG50QmVQcmVzZXJ2ZWRJZkZhbHN5KG5hbWUpKSB7XG4gICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpc0Jvb2xlYW5BdHRyKG5hbWUpKVxuICAgICAgdmFsdWUgPSBuYW1lO1xuICAgIHNldElmQ2hhbmdlZChlbCwgbmFtZSwgdmFsdWUpO1xuICB9XG59XG5mdW5jdGlvbiBzZXRJZkNoYW5nZWQoZWwsIGF0dHJOYW1lLCB2YWx1ZSkge1xuICBpZiAoZWwuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKSAhPSB2YWx1ZSkge1xuICAgIGVsLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgdmFsdWUpO1xuICB9XG59XG5mdW5jdGlvbiBzZXRQcm9wZXJ0eUlmQ2hhbmdlZChlbCwgcHJvcE5hbWUsIHZhbHVlKSB7XG4gIGlmIChlbFtwcm9wTmFtZV0gIT09IHZhbHVlKSB7XG4gICAgZWxbcHJvcE5hbWVdID0gdmFsdWU7XG4gIH1cbn1cbmZ1bmN0aW9uIHVwZGF0ZVNlbGVjdChlbCwgdmFsdWUpIHtcbiAgY29uc3QgYXJyYXlXcmFwcGVkVmFsdWUgPSBbXS5jb25jYXQodmFsdWUpLm1hcCgodmFsdWUyKSA9PiB7XG4gICAgcmV0dXJuIHZhbHVlMiArIFwiXCI7XG4gIH0pO1xuICBBcnJheS5mcm9tKGVsLm9wdGlvbnMpLmZvckVhY2goKG9wdGlvbikgPT4ge1xuICAgIG9wdGlvbi5zZWxlY3RlZCA9IGFycmF5V3JhcHBlZFZhbHVlLmluY2x1ZGVzKG9wdGlvbi52YWx1ZSk7XG4gIH0pO1xufVxuZnVuY3Rpb24gY2FtZWxDYXNlKHN1YmplY3QpIHtcbiAgcmV0dXJuIHN1YmplY3QudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8tKFxcdykvZywgKG1hdGNoLCBjaGFyKSA9PiBjaGFyLnRvVXBwZXJDYXNlKCkpO1xufVxuZnVuY3Rpb24gY2hlY2tlZEF0dHJMb29zZUNvbXBhcmUodmFsdWVBLCB2YWx1ZUIpIHtcbiAgcmV0dXJuIHZhbHVlQSA9PSB2YWx1ZUI7XG59XG5mdW5jdGlvbiBzYWZlUGFyc2VCb29sZWFuKHJhd1ZhbHVlKSB7XG4gIGlmIChbMSwgXCIxXCIsIFwidHJ1ZVwiLCBcIm9uXCIsIFwieWVzXCIsIHRydWVdLmluY2x1ZGVzKHJhd1ZhbHVlKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChbMCwgXCIwXCIsIFwiZmFsc2VcIiwgXCJvZmZcIiwgXCJub1wiLCBmYWxzZV0uaW5jbHVkZXMocmF3VmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiByYXdWYWx1ZSA/IEJvb2xlYW4ocmF3VmFsdWUpIDogbnVsbDtcbn1cbmZ1bmN0aW9uIGlzQm9vbGVhbkF0dHIoYXR0ck5hbWUpIHtcbiAgY29uc3QgYm9vbGVhbkF0dHJpYnV0ZXMgPSBbXG4gICAgXCJkaXNhYmxlZFwiLFxuICAgIFwiY2hlY2tlZFwiLFxuICAgIFwicmVxdWlyZWRcIixcbiAgICBcInJlYWRvbmx5XCIsXG4gICAgXCJvcGVuXCIsXG4gICAgXCJzZWxlY3RlZFwiLFxuICAgIFwiYXV0b2ZvY3VzXCIsXG4gICAgXCJpdGVtc2NvcGVcIixcbiAgICBcIm11bHRpcGxlXCIsXG4gICAgXCJub3ZhbGlkYXRlXCIsXG4gICAgXCJhbGxvd2Z1bGxzY3JlZW5cIixcbiAgICBcImFsbG93cGF5bWVudHJlcXVlc3RcIixcbiAgICBcImZvcm1ub3ZhbGlkYXRlXCIsXG4gICAgXCJhdXRvcGxheVwiLFxuICAgIFwiY29udHJvbHNcIixcbiAgICBcImxvb3BcIixcbiAgICBcIm11dGVkXCIsXG4gICAgXCJwbGF5c2lubGluZVwiLFxuICAgIFwiZGVmYXVsdFwiLFxuICAgIFwiaXNtYXBcIixcbiAgICBcInJldmVyc2VkXCIsXG4gICAgXCJhc3luY1wiLFxuICAgIFwiZGVmZXJcIixcbiAgICBcIm5vbW9kdWxlXCJcbiAgXTtcbiAgcmV0dXJuIGJvb2xlYW5BdHRyaWJ1dGVzLmluY2x1ZGVzKGF0dHJOYW1lKTtcbn1cbmZ1bmN0aW9uIGF0dHJpYnV0ZVNob3VsZG50QmVQcmVzZXJ2ZWRJZkZhbHN5KG5hbWUpIHtcbiAgcmV0dXJuICFbXCJhcmlhLXByZXNzZWRcIiwgXCJhcmlhLWNoZWNrZWRcIiwgXCJhcmlhLWV4cGFuZGVkXCIsIFwiYXJpYS1zZWxlY3RlZFwiXS5pbmNsdWRlcyhuYW1lKTtcbn1cbmZ1bmN0aW9uIGdldEJpbmRpbmcoZWwsIG5hbWUsIGZhbGxiYWNrKSB7XG4gIGlmIChlbC5feF9iaW5kaW5ncyAmJiBlbC5feF9iaW5kaW5nc1tuYW1lXSAhPT0gdm9pZCAwKVxuICAgIHJldHVybiBlbC5feF9iaW5kaW5nc1tuYW1lXTtcbiAgcmV0dXJuIGdldEF0dHJpYnV0ZUJpbmRpbmcoZWwsIG5hbWUsIGZhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RQcm9wKGVsLCBuYW1lLCBmYWxsYmFjaywgZXh0cmFjdCA9IHRydWUpIHtcbiAgaWYgKGVsLl94X2JpbmRpbmdzICYmIGVsLl94X2JpbmRpbmdzW25hbWVdICE9PSB2b2lkIDApXG4gICAgcmV0dXJuIGVsLl94X2JpbmRpbmdzW25hbWVdO1xuICBpZiAoZWwuX3hfaW5saW5lQmluZGluZ3MgJiYgZWwuX3hfaW5saW5lQmluZGluZ3NbbmFtZV0gIT09IHZvaWQgMCkge1xuICAgIGxldCBiaW5kaW5nID0gZWwuX3hfaW5saW5lQmluZGluZ3NbbmFtZV07XG4gICAgYmluZGluZy5leHRyYWN0ID0gZXh0cmFjdDtcbiAgICByZXR1cm4gZG9udEF1dG9FdmFsdWF0ZUZ1bmN0aW9ucygoKSA9PiB7XG4gICAgICByZXR1cm4gZXZhbHVhdGUoZWwsIGJpbmRpbmcuZXhwcmVzc2lvbik7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIGdldEF0dHJpYnV0ZUJpbmRpbmcoZWwsIG5hbWUsIGZhbGxiYWNrKTtcbn1cbmZ1bmN0aW9uIGdldEF0dHJpYnV0ZUJpbmRpbmcoZWwsIG5hbWUsIGZhbGxiYWNrKSB7XG4gIGxldCBhdHRyID0gZWwuZ2V0QXR0cmlidXRlKG5hbWUpO1xuICBpZiAoYXR0ciA9PT0gbnVsbClcbiAgICByZXR1cm4gdHlwZW9mIGZhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIgPyBmYWxsYmFjaygpIDogZmFsbGJhY2s7XG4gIGlmIChhdHRyID09PSBcIlwiKVxuICAgIHJldHVybiB0cnVlO1xuICBpZiAoaXNCb29sZWFuQXR0cihuYW1lKSkge1xuICAgIHJldHVybiAhIVtuYW1lLCBcInRydWVcIl0uaW5jbHVkZXMoYXR0cik7XG4gIH1cbiAgcmV0dXJuIGF0dHI7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy91dGlscy9kZWJvdW5jZS5qc1xuZnVuY3Rpb24gZGVib3VuY2UoZnVuYywgd2FpdCkge1xuICB2YXIgdGltZW91dDtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIHZhciBjb250ZXh0ID0gdGhpcywgYXJncyA9IGFyZ3VtZW50cztcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICB9O1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gIH07XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy91dGlscy90aHJvdHRsZS5qc1xuZnVuY3Rpb24gdGhyb3R0bGUoZnVuYywgbGltaXQpIHtcbiAgbGV0IGluVGhyb3R0bGU7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBsZXQgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgaWYgKCFpblRocm90dGxlKSB7XG4gICAgICBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgaW5UaHJvdHRsZSA9IHRydWU7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IGluVGhyb3R0bGUgPSBmYWxzZSwgbGltaXQpO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2VudGFuZ2xlLmpzXG5mdW5jdGlvbiBlbnRhbmdsZSh7IGdldDogb3V0ZXJHZXQsIHNldDogb3V0ZXJTZXQgfSwgeyBnZXQ6IGlubmVyR2V0LCBzZXQ6IGlubmVyU2V0IH0pIHtcbiAgbGV0IGZpcnN0UnVuID0gdHJ1ZTtcbiAgbGV0IG91dGVySGFzaDtcbiAgbGV0IGlubmVySGFzaDtcbiAgbGV0IHJlZmVyZW5jZSA9IGVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IG91dGVyID0gb3V0ZXJHZXQoKTtcbiAgICBsZXQgaW5uZXIgPSBpbm5lckdldCgpO1xuICAgIGlmIChmaXJzdFJ1bikge1xuICAgICAgaW5uZXJTZXQoY2xvbmVJZk9iamVjdChvdXRlcikpO1xuICAgICAgZmlyc3RSdW4gPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IG91dGVySGFzaExhdGVzdCA9IEpTT04uc3RyaW5naWZ5KG91dGVyKTtcbiAgICAgIGxldCBpbm5lckhhc2hMYXRlc3QgPSBKU09OLnN0cmluZ2lmeShpbm5lcik7XG4gICAgICBpZiAob3V0ZXJIYXNoTGF0ZXN0ICE9PSBvdXRlckhhc2gpIHtcbiAgICAgICAgaW5uZXJTZXQoY2xvbmVJZk9iamVjdChvdXRlcikpO1xuICAgICAgfSBlbHNlIGlmIChvdXRlckhhc2hMYXRlc3QgIT09IGlubmVySGFzaExhdGVzdCkge1xuICAgICAgICBvdXRlclNldChjbG9uZUlmT2JqZWN0KGlubmVyKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgfVxuICAgIH1cbiAgICBvdXRlckhhc2ggPSBKU09OLnN0cmluZ2lmeShvdXRlckdldCgpKTtcbiAgICBpbm5lckhhc2ggPSBKU09OLnN0cmluZ2lmeShpbm5lckdldCgpKTtcbiAgfSk7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgcmVsZWFzZShyZWZlcmVuY2UpO1xuICB9O1xufVxuZnVuY3Rpb24gY2xvbmVJZk9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh2YWx1ZSkpIDogdmFsdWU7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9wbHVnaW4uanNcbmZ1bmN0aW9uIHBsdWdpbihjYWxsYmFjaykge1xuICBsZXQgY2FsbGJhY2tzID0gQXJyYXkuaXNBcnJheShjYWxsYmFjaykgPyBjYWxsYmFjayA6IFtjYWxsYmFja107XG4gIGNhbGxiYWNrcy5mb3JFYWNoKChpKSA9PiBpKGFscGluZV9kZWZhdWx0KSk7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9zdG9yZS5qc1xudmFyIHN0b3JlcyA9IHt9O1xudmFyIGlzUmVhY3RpdmUgPSBmYWxzZTtcbmZ1bmN0aW9uIHN0b3JlKG5hbWUsIHZhbHVlKSB7XG4gIGlmICghaXNSZWFjdGl2ZSkge1xuICAgIHN0b3JlcyA9IHJlYWN0aXZlKHN0b3Jlcyk7XG4gICAgaXNSZWFjdGl2ZSA9IHRydWU7XG4gIH1cbiAgaWYgKHZhbHVlID09PSB2b2lkIDApIHtcbiAgICByZXR1cm4gc3RvcmVzW25hbWVdO1xuICB9XG4gIHN0b3Jlc1tuYW1lXSA9IHZhbHVlO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIHZhbHVlLmhhc093blByb3BlcnR5KFwiaW5pdFwiKSAmJiB0eXBlb2YgdmFsdWUuaW5pdCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgc3RvcmVzW25hbWVdLmluaXQoKTtcbiAgfVxuICBpbml0SW50ZXJjZXB0b3JzKHN0b3Jlc1tuYW1lXSk7XG59XG5mdW5jdGlvbiBnZXRTdG9yZXMoKSB7XG4gIHJldHVybiBzdG9yZXM7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9iaW5kcy5qc1xudmFyIGJpbmRzID0ge307XG5mdW5jdGlvbiBiaW5kMihuYW1lLCBiaW5kaW5ncykge1xuICBsZXQgZ2V0QmluZGluZ3MgPSB0eXBlb2YgYmluZGluZ3MgIT09IFwiZnVuY3Rpb25cIiA/ICgpID0+IGJpbmRpbmdzIDogYmluZGluZ3M7XG4gIGlmIChuYW1lIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgIHJldHVybiBhcHBseUJpbmRpbmdzT2JqZWN0KG5hbWUsIGdldEJpbmRpbmdzKCkpO1xuICB9IGVsc2Uge1xuICAgIGJpbmRzW25hbWVdID0gZ2V0QmluZGluZ3M7XG4gIH1cbiAgcmV0dXJuICgpID0+IHtcbiAgfTtcbn1cbmZ1bmN0aW9uIGluamVjdEJpbmRpbmdQcm92aWRlcnMob2JqKSB7XG4gIE9iamVjdC5lbnRyaWVzKGJpbmRzKS5mb3JFYWNoKChbbmFtZSwgY2FsbGJhY2tdKSA9PiB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwge1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soLi4uYXJncyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4gb2JqO1xufVxuZnVuY3Rpb24gYXBwbHlCaW5kaW5nc09iamVjdChlbCwgb2JqLCBvcmlnaW5hbCkge1xuICBsZXQgY2xlYW51cFJ1bm5lcnMgPSBbXTtcbiAgd2hpbGUgKGNsZWFudXBSdW5uZXJzLmxlbmd0aClcbiAgICBjbGVhbnVwUnVubmVycy5wb3AoKSgpO1xuICBsZXQgYXR0cmlidXRlcyA9IE9iamVjdC5lbnRyaWVzKG9iaikubWFwKChbbmFtZSwgdmFsdWVdKSA9PiAoeyBuYW1lLCB2YWx1ZSB9KSk7XG4gIGxldCBzdGF0aWNBdHRyaWJ1dGVzID0gYXR0cmlidXRlc09ubHkoYXR0cmlidXRlcyk7XG4gIGF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzLm1hcCgoYXR0cmlidXRlKSA9PiB7XG4gICAgaWYgKHN0YXRpY0F0dHJpYnV0ZXMuZmluZCgoYXR0cikgPT4gYXR0ci5uYW1lID09PSBhdHRyaWJ1dGUubmFtZSkpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IGB4LWJpbmQ6JHthdHRyaWJ1dGUubmFtZX1gLFxuICAgICAgICB2YWx1ZTogYFwiJHthdHRyaWJ1dGUudmFsdWV9XCJgXG4gICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gYXR0cmlidXRlO1xuICB9KTtcbiAgZGlyZWN0aXZlcyhlbCwgYXR0cmlidXRlcywgb3JpZ2luYWwpLm1hcCgoaGFuZGxlKSA9PiB7XG4gICAgY2xlYW51cFJ1bm5lcnMucHVzaChoYW5kbGUucnVuQ2xlYW51cHMpO1xuICAgIGhhbmRsZSgpO1xuICB9KTtcbiAgcmV0dXJuICgpID0+IHtcbiAgICB3aGlsZSAoY2xlYW51cFJ1bm5lcnMubGVuZ3RoKVxuICAgICAgY2xlYW51cFJ1bm5lcnMucG9wKCkoKTtcbiAgfTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RhdGFzLmpzXG52YXIgZGF0YXMgPSB7fTtcbmZ1bmN0aW9uIGRhdGEobmFtZSwgY2FsbGJhY2spIHtcbiAgZGF0YXNbbmFtZV0gPSBjYWxsYmFjaztcbn1cbmZ1bmN0aW9uIGluamVjdERhdGFQcm92aWRlcnMob2JqLCBjb250ZXh0KSB7XG4gIE9iamVjdC5lbnRyaWVzKGRhdGFzKS5mb3JFYWNoKChbbmFtZSwgY2FsbGJhY2tdKSA9PiB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgbmFtZSwge1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2suYmluZChjb250ZXh0KSguLi5hcmdzKTtcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIG9iajtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2FscGluZS5qc1xudmFyIEFscGluZSA9IHtcbiAgZ2V0IHJlYWN0aXZlKCkge1xuICAgIHJldHVybiByZWFjdGl2ZTtcbiAgfSxcbiAgZ2V0IHJlbGVhc2UoKSB7XG4gICAgcmV0dXJuIHJlbGVhc2U7XG4gIH0sXG4gIGdldCBlZmZlY3QoKSB7XG4gICAgcmV0dXJuIGVmZmVjdDtcbiAgfSxcbiAgZ2V0IHJhdygpIHtcbiAgICByZXR1cm4gcmF3O1xuICB9LFxuICB2ZXJzaW9uOiBcIjMuMTQuMVwiLFxuICBmbHVzaEFuZFN0b3BEZWZlcnJpbmdNdXRhdGlvbnMsXG4gIGRvbnRBdXRvRXZhbHVhdGVGdW5jdGlvbnMsXG4gIGRpc2FibGVFZmZlY3RTY2hlZHVsaW5nLFxuICBzdGFydE9ic2VydmluZ011dGF0aW9ucyxcbiAgc3RvcE9ic2VydmluZ011dGF0aW9ucyxcbiAgc2V0UmVhY3Rpdml0eUVuZ2luZSxcbiAgb25BdHRyaWJ1dGVSZW1vdmVkLFxuICBvbkF0dHJpYnV0ZXNBZGRlZCxcbiAgY2xvc2VzdERhdGFTdGFjayxcbiAgc2tpcER1cmluZ0Nsb25lLFxuICBvbmx5RHVyaW5nQ2xvbmUsXG4gIGFkZFJvb3RTZWxlY3RvcixcbiAgYWRkSW5pdFNlbGVjdG9yLFxuICBpbnRlcmNlcHRDbG9uZSxcbiAgYWRkU2NvcGVUb05vZGUsXG4gIGRlZmVyTXV0YXRpb25zLFxuICBtYXBBdHRyaWJ1dGVzLFxuICBldmFsdWF0ZUxhdGVyLFxuICBpbnRlcmNlcHRJbml0LFxuICBzZXRFdmFsdWF0b3IsXG4gIG1lcmdlUHJveGllcyxcbiAgZXh0cmFjdFByb3AsXG4gIGZpbmRDbG9zZXN0LFxuICBvbkVsUmVtb3ZlZCxcbiAgY2xvc2VzdFJvb3QsXG4gIGRlc3Ryb3lUcmVlLFxuICBpbnRlcmNlcHRvcixcbiAgLy8gSU5URVJOQUw6IG5vdCBwdWJsaWMgQVBJIGFuZCBpcyBzdWJqZWN0IHRvIGNoYW5nZSB3aXRob3V0IG1ham9yIHJlbGVhc2UuXG4gIHRyYW5zaXRpb24sXG4gIC8vIElOVEVSTkFMXG4gIHNldFN0eWxlcyxcbiAgLy8gSU5URVJOQUxcbiAgbXV0YXRlRG9tLFxuICBkaXJlY3RpdmUsXG4gIGVudGFuZ2xlLFxuICB0aHJvdHRsZSxcbiAgZGVib3VuY2UsXG4gIGV2YWx1YXRlLFxuICBpbml0VHJlZSxcbiAgbmV4dFRpY2ssXG4gIHByZWZpeGVkOiBwcmVmaXgsXG4gIHByZWZpeDogc2V0UHJlZml4LFxuICBwbHVnaW4sXG4gIG1hZ2ljLFxuICBzdG9yZSxcbiAgc3RhcnQsXG4gIGNsb25lLFxuICAvLyBJTlRFUk5BTFxuICBjbG9uZU5vZGUsXG4gIC8vIElOVEVSTkFMXG4gIGJvdW5kOiBnZXRCaW5kaW5nLFxuICAkZGF0YTogc2NvcGUsXG4gIHdhdGNoLFxuICB3YWxrLFxuICBkYXRhLFxuICBiaW5kOiBiaW5kMlxufTtcbnZhciBhbHBpbmVfZGVmYXVsdCA9IEFscGluZTtcblxuLy8gbm9kZV9tb2R1bGVzL0B2dWUvc2hhcmVkL2Rpc3Qvc2hhcmVkLmVzbS1idW5kbGVyLmpzXG5mdW5jdGlvbiBtYWtlTWFwKHN0ciwgZXhwZWN0c0xvd2VyQ2FzZSkge1xuICBjb25zdCBtYXAgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgY29uc3QgbGlzdCA9IHN0ci5zcGxpdChcIixcIik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIG1hcFtsaXN0W2ldXSA9IHRydWU7XG4gIH1cbiAgcmV0dXJuIGV4cGVjdHNMb3dlckNhc2UgPyAodmFsKSA9PiAhIW1hcFt2YWwudG9Mb3dlckNhc2UoKV0gOiAodmFsKSA9PiAhIW1hcFt2YWxdO1xufVxudmFyIHNwZWNpYWxCb29sZWFuQXR0cnMgPSBgaXRlbXNjb3BlLGFsbG93ZnVsbHNjcmVlbixmb3Jtbm92YWxpZGF0ZSxpc21hcCxub21vZHVsZSxub3ZhbGlkYXRlLHJlYWRvbmx5YDtcbnZhciBpc0Jvb2xlYW5BdHRyMiA9IC8qIEBfX1BVUkVfXyAqLyBtYWtlTWFwKHNwZWNpYWxCb29sZWFuQXR0cnMgKyBgLGFzeW5jLGF1dG9mb2N1cyxhdXRvcGxheSxjb250cm9scyxkZWZhdWx0LGRlZmVyLGRpc2FibGVkLGhpZGRlbixsb29wLG9wZW4scmVxdWlyZWQscmV2ZXJzZWQsc2NvcGVkLHNlYW1sZXNzLGNoZWNrZWQsbXV0ZWQsbXVsdGlwbGUsc2VsZWN0ZWRgKTtcbnZhciBFTVBUWV9PQkogPSB0cnVlID8gT2JqZWN0LmZyZWV6ZSh7fSkgOiB7fTtcbnZhciBFTVBUWV9BUlIgPSB0cnVlID8gT2JqZWN0LmZyZWV6ZShbXSkgOiBbXTtcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgaGFzT3duID0gKHZhbCwga2V5KSA9PiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbCwga2V5KTtcbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheTtcbnZhciBpc01hcCA9ICh2YWwpID0+IHRvVHlwZVN0cmluZyh2YWwpID09PSBcIltvYmplY3QgTWFwXVwiO1xudmFyIGlzU3RyaW5nID0gKHZhbCkgPT4gdHlwZW9mIHZhbCA9PT0gXCJzdHJpbmdcIjtcbnZhciBpc1N5bWJvbCA9ICh2YWwpID0+IHR5cGVvZiB2YWwgPT09IFwic3ltYm9sXCI7XG52YXIgaXNPYmplY3QgPSAodmFsKSA9PiB2YWwgIT09IG51bGwgJiYgdHlwZW9mIHZhbCA9PT0gXCJvYmplY3RcIjtcbnZhciBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG52YXIgdG9UeXBlU3RyaW5nID0gKHZhbHVlKSA9PiBvYmplY3RUb1N0cmluZy5jYWxsKHZhbHVlKTtcbnZhciB0b1Jhd1R5cGUgPSAodmFsdWUpID0+IHtcbiAgcmV0dXJuIHRvVHlwZVN0cmluZyh2YWx1ZSkuc2xpY2UoOCwgLTEpO1xufTtcbnZhciBpc0ludGVnZXJLZXkgPSAoa2V5KSA9PiBpc1N0cmluZyhrZXkpICYmIGtleSAhPT0gXCJOYU5cIiAmJiBrZXlbMF0gIT09IFwiLVwiICYmIFwiXCIgKyBwYXJzZUludChrZXksIDEwKSA9PT0ga2V5O1xudmFyIGNhY2hlU3RyaW5nRnVuY3Rpb24gPSAoZm4pID0+IHtcbiAgY29uc3QgY2FjaGUgPSAvKiBAX19QVVJFX18gKi8gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgcmV0dXJuIChzdHIpID0+IHtcbiAgICBjb25zdCBoaXQgPSBjYWNoZVtzdHJdO1xuICAgIHJldHVybiBoaXQgfHwgKGNhY2hlW3N0cl0gPSBmbihzdHIpKTtcbiAgfTtcbn07XG52YXIgY2FtZWxpemVSRSA9IC8tKFxcdykvZztcbnZhciBjYW1lbGl6ZSA9IGNhY2hlU3RyaW5nRnVuY3Rpb24oKHN0cikgPT4ge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoY2FtZWxpemVSRSwgKF8sIGMpID0+IGMgPyBjLnRvVXBwZXJDYXNlKCkgOiBcIlwiKTtcbn0pO1xudmFyIGh5cGhlbmF0ZVJFID0gL1xcQihbQS1aXSkvZztcbnZhciBoeXBoZW5hdGUgPSBjYWNoZVN0cmluZ0Z1bmN0aW9uKChzdHIpID0+IHN0ci5yZXBsYWNlKGh5cGhlbmF0ZVJFLCBcIi0kMVwiKS50b0xvd2VyQ2FzZSgpKTtcbnZhciBjYXBpdGFsaXplID0gY2FjaGVTdHJpbmdGdW5jdGlvbigoc3RyKSA9PiBzdHIuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHIuc2xpY2UoMSkpO1xudmFyIHRvSGFuZGxlcktleSA9IGNhY2hlU3RyaW5nRnVuY3Rpb24oKHN0cikgPT4gc3RyID8gYG9uJHtjYXBpdGFsaXplKHN0cil9YCA6IGBgKTtcbnZhciBoYXNDaGFuZ2VkID0gKHZhbHVlLCBvbGRWYWx1ZSkgPT4gdmFsdWUgIT09IG9sZFZhbHVlICYmICh2YWx1ZSA9PT0gdmFsdWUgfHwgb2xkVmFsdWUgPT09IG9sZFZhbHVlKTtcblxuLy8gbm9kZV9tb2R1bGVzL0B2dWUvcmVhY3Rpdml0eS9kaXN0L3JlYWN0aXZpdHkuZXNtLWJ1bmRsZXIuanNcbnZhciB0YXJnZXRNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IFdlYWtNYXAoKTtcbnZhciBlZmZlY3RTdGFjayA9IFtdO1xudmFyIGFjdGl2ZUVmZmVjdDtcbnZhciBJVEVSQVRFX0tFWSA9IFN5bWJvbCh0cnVlID8gXCJpdGVyYXRlXCIgOiBcIlwiKTtcbnZhciBNQVBfS0VZX0lURVJBVEVfS0VZID0gU3ltYm9sKHRydWUgPyBcIk1hcCBrZXkgaXRlcmF0ZVwiIDogXCJcIik7XG5mdW5jdGlvbiBpc0VmZmVjdChmbikge1xuICByZXR1cm4gZm4gJiYgZm4uX2lzRWZmZWN0ID09PSB0cnVlO1xufVxuZnVuY3Rpb24gZWZmZWN0Mihmbiwgb3B0aW9ucyA9IEVNUFRZX09CSikge1xuICBpZiAoaXNFZmZlY3QoZm4pKSB7XG4gICAgZm4gPSBmbi5yYXc7XG4gIH1cbiAgY29uc3QgZWZmZWN0MyA9IGNyZWF0ZVJlYWN0aXZlRWZmZWN0KGZuLCBvcHRpb25zKTtcbiAgaWYgKCFvcHRpb25zLmxhenkpIHtcbiAgICBlZmZlY3QzKCk7XG4gIH1cbiAgcmV0dXJuIGVmZmVjdDM7XG59XG5mdW5jdGlvbiBzdG9wKGVmZmVjdDMpIHtcbiAgaWYgKGVmZmVjdDMuYWN0aXZlKSB7XG4gICAgY2xlYW51cChlZmZlY3QzKTtcbiAgICBpZiAoZWZmZWN0My5vcHRpb25zLm9uU3RvcCkge1xuICAgICAgZWZmZWN0My5vcHRpb25zLm9uU3RvcCgpO1xuICAgIH1cbiAgICBlZmZlY3QzLmFjdGl2ZSA9IGZhbHNlO1xuICB9XG59XG52YXIgdWlkID0gMDtcbmZ1bmN0aW9uIGNyZWF0ZVJlYWN0aXZlRWZmZWN0KGZuLCBvcHRpb25zKSB7XG4gIGNvbnN0IGVmZmVjdDMgPSBmdW5jdGlvbiByZWFjdGl2ZUVmZmVjdCgpIHtcbiAgICBpZiAoIWVmZmVjdDMuYWN0aXZlKSB7XG4gICAgICByZXR1cm4gZm4oKTtcbiAgICB9XG4gICAgaWYgKCFlZmZlY3RTdGFjay5pbmNsdWRlcyhlZmZlY3QzKSkge1xuICAgICAgY2xlYW51cChlZmZlY3QzKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGVuYWJsZVRyYWNraW5nKCk7XG4gICAgICAgIGVmZmVjdFN0YWNrLnB1c2goZWZmZWN0Myk7XG4gICAgICAgIGFjdGl2ZUVmZmVjdCA9IGVmZmVjdDM7XG4gICAgICAgIHJldHVybiBmbigpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgZWZmZWN0U3RhY2sucG9wKCk7XG4gICAgICAgIHJlc2V0VHJhY2tpbmcoKTtcbiAgICAgICAgYWN0aXZlRWZmZWN0ID0gZWZmZWN0U3RhY2tbZWZmZWN0U3RhY2subGVuZ3RoIC0gMV07XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBlZmZlY3QzLmlkID0gdWlkKys7XG4gIGVmZmVjdDMuYWxsb3dSZWN1cnNlID0gISFvcHRpb25zLmFsbG93UmVjdXJzZTtcbiAgZWZmZWN0My5faXNFZmZlY3QgPSB0cnVlO1xuICBlZmZlY3QzLmFjdGl2ZSA9IHRydWU7XG4gIGVmZmVjdDMucmF3ID0gZm47XG4gIGVmZmVjdDMuZGVwcyA9IFtdO1xuICBlZmZlY3QzLm9wdGlvbnMgPSBvcHRpb25zO1xuICByZXR1cm4gZWZmZWN0Mztcbn1cbmZ1bmN0aW9uIGNsZWFudXAoZWZmZWN0Mykge1xuICBjb25zdCB7IGRlcHMgfSA9IGVmZmVjdDM7XG4gIGlmIChkZXBzLmxlbmd0aCkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGVwcy5sZW5ndGg7IGkrKykge1xuICAgICAgZGVwc1tpXS5kZWxldGUoZWZmZWN0Myk7XG4gICAgfVxuICAgIGRlcHMubGVuZ3RoID0gMDtcbiAgfVxufVxudmFyIHNob3VsZFRyYWNrID0gdHJ1ZTtcbnZhciB0cmFja1N0YWNrID0gW107XG5mdW5jdGlvbiBwYXVzZVRyYWNraW5nKCkge1xuICB0cmFja1N0YWNrLnB1c2goc2hvdWxkVHJhY2spO1xuICBzaG91bGRUcmFjayA9IGZhbHNlO1xufVxuZnVuY3Rpb24gZW5hYmxlVHJhY2tpbmcoKSB7XG4gIHRyYWNrU3RhY2sucHVzaChzaG91bGRUcmFjayk7XG4gIHNob3VsZFRyYWNrID0gdHJ1ZTtcbn1cbmZ1bmN0aW9uIHJlc2V0VHJhY2tpbmcoKSB7XG4gIGNvbnN0IGxhc3QgPSB0cmFja1N0YWNrLnBvcCgpO1xuICBzaG91bGRUcmFjayA9IGxhc3QgPT09IHZvaWQgMCA/IHRydWUgOiBsYXN0O1xufVxuZnVuY3Rpb24gdHJhY2sodGFyZ2V0LCB0eXBlLCBrZXkpIHtcbiAgaWYgKCFzaG91bGRUcmFjayB8fCBhY3RpdmVFZmZlY3QgPT09IHZvaWQgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgZGVwc01hcCA9IHRhcmdldE1hcC5nZXQodGFyZ2V0KTtcbiAgaWYgKCFkZXBzTWFwKSB7XG4gICAgdGFyZ2V0TWFwLnNldCh0YXJnZXQsIGRlcHNNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpKTtcbiAgfVxuICBsZXQgZGVwID0gZGVwc01hcC5nZXQoa2V5KTtcbiAgaWYgKCFkZXApIHtcbiAgICBkZXBzTWFwLnNldChrZXksIGRlcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCkpO1xuICB9XG4gIGlmICghZGVwLmhhcyhhY3RpdmVFZmZlY3QpKSB7XG4gICAgZGVwLmFkZChhY3RpdmVFZmZlY3QpO1xuICAgIGFjdGl2ZUVmZmVjdC5kZXBzLnB1c2goZGVwKTtcbiAgICBpZiAoYWN0aXZlRWZmZWN0Lm9wdGlvbnMub25UcmFjaykge1xuICAgICAgYWN0aXZlRWZmZWN0Lm9wdGlvbnMub25UcmFjayh7XG4gICAgICAgIGVmZmVjdDogYWN0aXZlRWZmZWN0LFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGtleVxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5mdW5jdGlvbiB0cmlnZ2VyKHRhcmdldCwgdHlwZSwga2V5LCBuZXdWYWx1ZSwgb2xkVmFsdWUsIG9sZFRhcmdldCkge1xuICBjb25zdCBkZXBzTWFwID0gdGFyZ2V0TWFwLmdldCh0YXJnZXQpO1xuICBpZiAoIWRlcHNNYXApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgZWZmZWN0cyA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgU2V0KCk7XG4gIGNvbnN0IGFkZDIgPSAoZWZmZWN0c1RvQWRkKSA9PiB7XG4gICAgaWYgKGVmZmVjdHNUb0FkZCkge1xuICAgICAgZWZmZWN0c1RvQWRkLmZvckVhY2goKGVmZmVjdDMpID0+IHtcbiAgICAgICAgaWYgKGVmZmVjdDMgIT09IGFjdGl2ZUVmZmVjdCB8fCBlZmZlY3QzLmFsbG93UmVjdXJzZSkge1xuICAgICAgICAgIGVmZmVjdHMuYWRkKGVmZmVjdDMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIGlmICh0eXBlID09PSBcImNsZWFyXCIpIHtcbiAgICBkZXBzTWFwLmZvckVhY2goYWRkMik7XG4gIH0gZWxzZSBpZiAoa2V5ID09PSBcImxlbmd0aFwiICYmIGlzQXJyYXkodGFyZ2V0KSkge1xuICAgIGRlcHNNYXAuZm9yRWFjaCgoZGVwLCBrZXkyKSA9PiB7XG4gICAgICBpZiAoa2V5MiA9PT0gXCJsZW5ndGhcIiB8fCBrZXkyID49IG5ld1ZhbHVlKSB7XG4gICAgICAgIGFkZDIoZGVwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoa2V5ICE9PSB2b2lkIDApIHtcbiAgICAgIGFkZDIoZGVwc01hcC5nZXQoa2V5KSk7XG4gICAgfVxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBcImFkZFwiOlxuICAgICAgICBpZiAoIWlzQXJyYXkodGFyZ2V0KSkge1xuICAgICAgICAgIGFkZDIoZGVwc01hcC5nZXQoSVRFUkFURV9LRVkpKTtcbiAgICAgICAgICBpZiAoaXNNYXAodGFyZ2V0KSkge1xuICAgICAgICAgICAgYWRkMihkZXBzTWFwLmdldChNQVBfS0VZX0lURVJBVEVfS0VZKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGlzSW50ZWdlcktleShrZXkpKSB7XG4gICAgICAgICAgYWRkMihkZXBzTWFwLmdldChcImxlbmd0aFwiKSk7XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiZGVsZXRlXCI6XG4gICAgICAgIGlmICghaXNBcnJheSh0YXJnZXQpKSB7XG4gICAgICAgICAgYWRkMihkZXBzTWFwLmdldChJVEVSQVRFX0tFWSkpO1xuICAgICAgICAgIGlmIChpc01hcCh0YXJnZXQpKSB7XG4gICAgICAgICAgICBhZGQyKGRlcHNNYXAuZ2V0KE1BUF9LRVlfSVRFUkFURV9LRVkpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwic2V0XCI6XG4gICAgICAgIGlmIChpc01hcCh0YXJnZXQpKSB7XG4gICAgICAgICAgYWRkMihkZXBzTWFwLmdldChJVEVSQVRFX0tFWSkpO1xuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICBjb25zdCBydW4gPSAoZWZmZWN0MykgPT4ge1xuICAgIGlmIChlZmZlY3QzLm9wdGlvbnMub25UcmlnZ2VyKSB7XG4gICAgICBlZmZlY3QzLm9wdGlvbnMub25UcmlnZ2VyKHtcbiAgICAgICAgZWZmZWN0OiBlZmZlY3QzLFxuICAgICAgICB0YXJnZXQsXG4gICAgICAgIGtleSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgbmV3VmFsdWUsXG4gICAgICAgIG9sZFZhbHVlLFxuICAgICAgICBvbGRUYXJnZXRcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZWZmZWN0My5vcHRpb25zLnNjaGVkdWxlcikge1xuICAgICAgZWZmZWN0My5vcHRpb25zLnNjaGVkdWxlcihlZmZlY3QzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZWZmZWN0MygpO1xuICAgIH1cbiAgfTtcbiAgZWZmZWN0cy5mb3JFYWNoKHJ1bik7XG59XG52YXIgaXNOb25UcmFja2FibGVLZXlzID0gLyogQF9fUFVSRV9fICovIG1ha2VNYXAoYF9fcHJvdG9fXyxfX3ZfaXNSZWYsX19pc1Z1ZWApO1xudmFyIGJ1aWx0SW5TeW1ib2xzID0gbmV3IFNldChPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhTeW1ib2wpLm1hcCgoa2V5KSA9PiBTeW1ib2xba2V5XSkuZmlsdGVyKGlzU3ltYm9sKSk7XG52YXIgZ2V0MiA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVHZXR0ZXIoKTtcbnZhciByZWFkb25seUdldCA9IC8qIEBfX1BVUkVfXyAqLyBjcmVhdGVHZXR0ZXIodHJ1ZSk7XG52YXIgYXJyYXlJbnN0cnVtZW50YXRpb25zID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUFycmF5SW5zdHJ1bWVudGF0aW9ucygpO1xuZnVuY3Rpb24gY3JlYXRlQXJyYXlJbnN0cnVtZW50YXRpb25zKCkge1xuICBjb25zdCBpbnN0cnVtZW50YXRpb25zID0ge307XG4gIFtcImluY2x1ZGVzXCIsIFwiaW5kZXhPZlwiLCBcImxhc3RJbmRleE9mXCJdLmZvckVhY2goKGtleSkgPT4ge1xuICAgIGluc3RydW1lbnRhdGlvbnNba2V5XSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IGFyciA9IHRvUmF3KHRoaXMpO1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSB0aGlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB0cmFjayhhcnIsIFwiZ2V0XCIsIGkgKyBcIlwiKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlcyA9IGFycltrZXldKC4uLmFyZ3MpO1xuICAgICAgaWYgKHJlcyA9PT0gLTEgfHwgcmVzID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gYXJyW2tleV0oLi4uYXJncy5tYXAodG9SYXcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG4gIFtcInB1c2hcIiwgXCJwb3BcIiwgXCJzaGlmdFwiLCBcInVuc2hpZnRcIiwgXCJzcGxpY2VcIl0uZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgaW5zdHJ1bWVudGF0aW9uc1trZXldID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgcGF1c2VUcmFja2luZygpO1xuICAgICAgY29uc3QgcmVzID0gdG9SYXcodGhpcylba2V5XS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICAgIHJlc2V0VHJhY2tpbmcoKTtcbiAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgfSk7XG4gIHJldHVybiBpbnN0cnVtZW50YXRpb25zO1xufVxuZnVuY3Rpb24gY3JlYXRlR2V0dGVyKGlzUmVhZG9ubHkgPSBmYWxzZSwgc2hhbGxvdyA9IGZhbHNlKSB7XG4gIHJldHVybiBmdW5jdGlvbiBnZXQzKHRhcmdldCwga2V5LCByZWNlaXZlcikge1xuICAgIGlmIChrZXkgPT09IFwiX192X2lzUmVhY3RpdmVcIikge1xuICAgICAgcmV0dXJuICFpc1JlYWRvbmx5O1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIl9fdl9pc1JlYWRvbmx5XCIpIHtcbiAgICAgIHJldHVybiBpc1JlYWRvbmx5O1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSBcIl9fdl9yYXdcIiAmJiByZWNlaXZlciA9PT0gKGlzUmVhZG9ubHkgPyBzaGFsbG93ID8gc2hhbGxvd1JlYWRvbmx5TWFwIDogcmVhZG9ubHlNYXAgOiBzaGFsbG93ID8gc2hhbGxvd1JlYWN0aXZlTWFwIDogcmVhY3RpdmVNYXApLmdldCh0YXJnZXQpKSB7XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRJc0FycmF5ID0gaXNBcnJheSh0YXJnZXQpO1xuICAgIGlmICghaXNSZWFkb25seSAmJiB0YXJnZXRJc0FycmF5ICYmIGhhc093bihhcnJheUluc3RydW1lbnRhdGlvbnMsIGtleSkpIHtcbiAgICAgIHJldHVybiBSZWZsZWN0LmdldChhcnJheUluc3RydW1lbnRhdGlvbnMsIGtleSwgcmVjZWl2ZXIpO1xuICAgIH1cbiAgICBjb25zdCByZXMgPSBSZWZsZWN0LmdldCh0YXJnZXQsIGtleSwgcmVjZWl2ZXIpO1xuICAgIGlmIChpc1N5bWJvbChrZXkpID8gYnVpbHRJblN5bWJvbHMuaGFzKGtleSkgOiBpc05vblRyYWNrYWJsZUtleXMoa2V5KSkge1xuICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgaWYgKCFpc1JlYWRvbmx5KSB7XG4gICAgICB0cmFjayh0YXJnZXQsIFwiZ2V0XCIsIGtleSk7XG4gICAgfVxuICAgIGlmIChzaGFsbG93KSB7XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBpZiAoaXNSZWYocmVzKSkge1xuICAgICAgY29uc3Qgc2hvdWxkVW53cmFwID0gIXRhcmdldElzQXJyYXkgfHwgIWlzSW50ZWdlcktleShrZXkpO1xuICAgICAgcmV0dXJuIHNob3VsZFVud3JhcCA/IHJlcy52YWx1ZSA6IHJlcztcbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KHJlcykpIHtcbiAgICAgIHJldHVybiBpc1JlYWRvbmx5ID8gcmVhZG9ubHkocmVzKSA6IHJlYWN0aXZlMihyZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xuICB9O1xufVxudmFyIHNldDIgPSAvKiBAX19QVVJFX18gKi8gY3JlYXRlU2V0dGVyKCk7XG5mdW5jdGlvbiBjcmVhdGVTZXR0ZXIoc2hhbGxvdyA9IGZhbHNlKSB7XG4gIHJldHVybiBmdW5jdGlvbiBzZXQzKHRhcmdldCwga2V5LCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICBsZXQgb2xkVmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICBpZiAoIXNoYWxsb3cpIHtcbiAgICAgIHZhbHVlID0gdG9SYXcodmFsdWUpO1xuICAgICAgb2xkVmFsdWUgPSB0b1JhdyhvbGRWYWx1ZSk7XG4gICAgICBpZiAoIWlzQXJyYXkodGFyZ2V0KSAmJiBpc1JlZihvbGRWYWx1ZSkgJiYgIWlzUmVmKHZhbHVlKSkge1xuICAgICAgICBvbGRWYWx1ZS52YWx1ZSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgaGFkS2V5ID0gaXNBcnJheSh0YXJnZXQpICYmIGlzSW50ZWdlcktleShrZXkpID8gTnVtYmVyKGtleSkgPCB0YXJnZXQubGVuZ3RoIDogaGFzT3duKHRhcmdldCwga2V5KTtcbiAgICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LnNldCh0YXJnZXQsIGtleSwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICBpZiAodGFyZ2V0ID09PSB0b1JhdyhyZWNlaXZlcikpIHtcbiAgICAgIGlmICghaGFkS2V5KSB7XG4gICAgICAgIHRyaWdnZXIodGFyZ2V0LCBcImFkZFwiLCBrZXksIHZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAoaGFzQ2hhbmdlZCh2YWx1ZSwgb2xkVmFsdWUpKSB7XG4gICAgICAgIHRyaWdnZXIodGFyZ2V0LCBcInNldFwiLCBrZXksIHZhbHVlLCBvbGRWYWx1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG5mdW5jdGlvbiBkZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSkge1xuICBjb25zdCBoYWRLZXkgPSBoYXNPd24odGFyZ2V0LCBrZXkpO1xuICBjb25zdCBvbGRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICBjb25zdCByZXN1bHQgPSBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRhcmdldCwga2V5KTtcbiAgaWYgKHJlc3VsdCAmJiBoYWRLZXkpIHtcbiAgICB0cmlnZ2VyKHRhcmdldCwgXCJkZWxldGVcIiwga2V5LCB2b2lkIDAsIG9sZFZhbHVlKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gaGFzKHRhcmdldCwga2V5KSB7XG4gIGNvbnN0IHJlc3VsdCA9IFJlZmxlY3QuaGFzKHRhcmdldCwga2V5KTtcbiAgaWYgKCFpc1N5bWJvbChrZXkpIHx8ICFidWlsdEluU3ltYm9scy5oYXMoa2V5KSkge1xuICAgIHRyYWNrKHRhcmdldCwgXCJoYXNcIiwga2V5KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuZnVuY3Rpb24gb3duS2V5cyh0YXJnZXQpIHtcbiAgdHJhY2sodGFyZ2V0LCBcIml0ZXJhdGVcIiwgaXNBcnJheSh0YXJnZXQpID8gXCJsZW5ndGhcIiA6IElURVJBVEVfS0VZKTtcbiAgcmV0dXJuIFJlZmxlY3Qub3duS2V5cyh0YXJnZXQpO1xufVxudmFyIG11dGFibGVIYW5kbGVycyA9IHtcbiAgZ2V0OiBnZXQyLFxuICBzZXQ6IHNldDIsXG4gIGRlbGV0ZVByb3BlcnR5LFxuICBoYXMsXG4gIG93bktleXNcbn07XG52YXIgcmVhZG9ubHlIYW5kbGVycyA9IHtcbiAgZ2V0OiByZWFkb25seUdldCxcbiAgc2V0KHRhcmdldCwga2V5KSB7XG4gICAgaWYgKHRydWUpIHtcbiAgICAgIGNvbnNvbGUud2FybihgU2V0IG9wZXJhdGlvbiBvbiBrZXkgXCIke1N0cmluZyhrZXkpfVwiIGZhaWxlZDogdGFyZ2V0IGlzIHJlYWRvbmx5LmAsIHRhcmdldCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBkZWxldGVQcm9wZXJ0eSh0YXJnZXQsIGtleSkge1xuICAgIGlmICh0cnVlKSB7XG4gICAgICBjb25zb2xlLndhcm4oYERlbGV0ZSBvcGVyYXRpb24gb24ga2V5IFwiJHtTdHJpbmcoa2V5KX1cIiBmYWlsZWQ6IHRhcmdldCBpcyByZWFkb25seS5gLCB0YXJnZXQpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufTtcbnZhciB0b1JlYWN0aXZlID0gKHZhbHVlKSA9PiBpc09iamVjdCh2YWx1ZSkgPyByZWFjdGl2ZTIodmFsdWUpIDogdmFsdWU7XG52YXIgdG9SZWFkb25seSA9ICh2YWx1ZSkgPT4gaXNPYmplY3QodmFsdWUpID8gcmVhZG9ubHkodmFsdWUpIDogdmFsdWU7XG52YXIgdG9TaGFsbG93ID0gKHZhbHVlKSA9PiB2YWx1ZTtcbnZhciBnZXRQcm90byA9ICh2KSA9PiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHYpO1xuZnVuY3Rpb24gZ2V0JDEodGFyZ2V0LCBrZXksIGlzUmVhZG9ubHkgPSBmYWxzZSwgaXNTaGFsbG93ID0gZmFsc2UpIHtcbiAgdGFyZ2V0ID0gdGFyZ2V0W1xuICAgIFwiX192X3Jhd1wiXG4gICAgLyogUkFXICovXG4gIF07XG4gIGNvbnN0IHJhd1RhcmdldCA9IHRvUmF3KHRhcmdldCk7XG4gIGNvbnN0IHJhd0tleSA9IHRvUmF3KGtleSk7XG4gIGlmIChrZXkgIT09IHJhd0tleSkge1xuICAgICFpc1JlYWRvbmx5ICYmIHRyYWNrKHJhd1RhcmdldCwgXCJnZXRcIiwga2V5KTtcbiAgfVxuICAhaXNSZWFkb25seSAmJiB0cmFjayhyYXdUYXJnZXQsIFwiZ2V0XCIsIHJhd0tleSk7XG4gIGNvbnN0IHsgaGFzOiBoYXMyIH0gPSBnZXRQcm90byhyYXdUYXJnZXQpO1xuICBjb25zdCB3cmFwID0gaXNTaGFsbG93ID8gdG9TaGFsbG93IDogaXNSZWFkb25seSA/IHRvUmVhZG9ubHkgOiB0b1JlYWN0aXZlO1xuICBpZiAoaGFzMi5jYWxsKHJhd1RhcmdldCwga2V5KSkge1xuICAgIHJldHVybiB3cmFwKHRhcmdldC5nZXQoa2V5KSk7XG4gIH0gZWxzZSBpZiAoaGFzMi5jYWxsKHJhd1RhcmdldCwgcmF3S2V5KSkge1xuICAgIHJldHVybiB3cmFwKHRhcmdldC5nZXQocmF3S2V5KSk7XG4gIH0gZWxzZSBpZiAodGFyZ2V0ICE9PSByYXdUYXJnZXQpIHtcbiAgICB0YXJnZXQuZ2V0KGtleSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGhhcyQxKGtleSwgaXNSZWFkb25seSA9IGZhbHNlKSB7XG4gIGNvbnN0IHRhcmdldCA9IHRoaXNbXG4gICAgXCJfX3ZfcmF3XCJcbiAgICAvKiBSQVcgKi9cbiAgXTtcbiAgY29uc3QgcmF3VGFyZ2V0ID0gdG9SYXcodGFyZ2V0KTtcbiAgY29uc3QgcmF3S2V5ID0gdG9SYXcoa2V5KTtcbiAgaWYgKGtleSAhPT0gcmF3S2V5KSB7XG4gICAgIWlzUmVhZG9ubHkgJiYgdHJhY2socmF3VGFyZ2V0LCBcImhhc1wiLCBrZXkpO1xuICB9XG4gICFpc1JlYWRvbmx5ICYmIHRyYWNrKHJhd1RhcmdldCwgXCJoYXNcIiwgcmF3S2V5KTtcbiAgcmV0dXJuIGtleSA9PT0gcmF3S2V5ID8gdGFyZ2V0LmhhcyhrZXkpIDogdGFyZ2V0LmhhcyhrZXkpIHx8IHRhcmdldC5oYXMocmF3S2V5KTtcbn1cbmZ1bmN0aW9uIHNpemUodGFyZ2V0LCBpc1JlYWRvbmx5ID0gZmFsc2UpIHtcbiAgdGFyZ2V0ID0gdGFyZ2V0W1xuICAgIFwiX192X3Jhd1wiXG4gICAgLyogUkFXICovXG4gIF07XG4gICFpc1JlYWRvbmx5ICYmIHRyYWNrKHRvUmF3KHRhcmdldCksIFwiaXRlcmF0ZVwiLCBJVEVSQVRFX0tFWSk7XG4gIHJldHVybiBSZWZsZWN0LmdldCh0YXJnZXQsIFwic2l6ZVwiLCB0YXJnZXQpO1xufVxuZnVuY3Rpb24gYWRkKHZhbHVlKSB7XG4gIHZhbHVlID0gdG9SYXcodmFsdWUpO1xuICBjb25zdCB0YXJnZXQgPSB0b1Jhdyh0aGlzKTtcbiAgY29uc3QgcHJvdG8gPSBnZXRQcm90byh0YXJnZXQpO1xuICBjb25zdCBoYWRLZXkgPSBwcm90by5oYXMuY2FsbCh0YXJnZXQsIHZhbHVlKTtcbiAgaWYgKCFoYWRLZXkpIHtcbiAgICB0YXJnZXQuYWRkKHZhbHVlKTtcbiAgICB0cmlnZ2VyKHRhcmdldCwgXCJhZGRcIiwgdmFsdWUsIHZhbHVlKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cbmZ1bmN0aW9uIHNldCQxKGtleSwgdmFsdWUpIHtcbiAgdmFsdWUgPSB0b1Jhdyh2YWx1ZSk7XG4gIGNvbnN0IHRhcmdldCA9IHRvUmF3KHRoaXMpO1xuICBjb25zdCB7IGhhczogaGFzMiwgZ2V0OiBnZXQzIH0gPSBnZXRQcm90byh0YXJnZXQpO1xuICBsZXQgaGFkS2V5ID0gaGFzMi5jYWxsKHRhcmdldCwga2V5KTtcbiAgaWYgKCFoYWRLZXkpIHtcbiAgICBrZXkgPSB0b1JhdyhrZXkpO1xuICAgIGhhZEtleSA9IGhhczIuY2FsbCh0YXJnZXQsIGtleSk7XG4gIH0gZWxzZSBpZiAodHJ1ZSkge1xuICAgIGNoZWNrSWRlbnRpdHlLZXlzKHRhcmdldCwgaGFzMiwga2V5KTtcbiAgfVxuICBjb25zdCBvbGRWYWx1ZSA9IGdldDMuY2FsbCh0YXJnZXQsIGtleSk7XG4gIHRhcmdldC5zZXQoa2V5LCB2YWx1ZSk7XG4gIGlmICghaGFkS2V5KSB7XG4gICAgdHJpZ2dlcih0YXJnZXQsIFwiYWRkXCIsIGtleSwgdmFsdWUpO1xuICB9IGVsc2UgaWYgKGhhc0NoYW5nZWQodmFsdWUsIG9sZFZhbHVlKSkge1xuICAgIHRyaWdnZXIodGFyZ2V0LCBcInNldFwiLCBrZXksIHZhbHVlLCBvbGRWYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59XG5mdW5jdGlvbiBkZWxldGVFbnRyeShrZXkpIHtcbiAgY29uc3QgdGFyZ2V0ID0gdG9SYXcodGhpcyk7XG4gIGNvbnN0IHsgaGFzOiBoYXMyLCBnZXQ6IGdldDMgfSA9IGdldFByb3RvKHRhcmdldCk7XG4gIGxldCBoYWRLZXkgPSBoYXMyLmNhbGwodGFyZ2V0LCBrZXkpO1xuICBpZiAoIWhhZEtleSkge1xuICAgIGtleSA9IHRvUmF3KGtleSk7XG4gICAgaGFkS2V5ID0gaGFzMi5jYWxsKHRhcmdldCwga2V5KTtcbiAgfSBlbHNlIGlmICh0cnVlKSB7XG4gICAgY2hlY2tJZGVudGl0eUtleXModGFyZ2V0LCBoYXMyLCBrZXkpO1xuICB9XG4gIGNvbnN0IG9sZFZhbHVlID0gZ2V0MyA/IGdldDMuY2FsbCh0YXJnZXQsIGtleSkgOiB2b2lkIDA7XG4gIGNvbnN0IHJlc3VsdCA9IHRhcmdldC5kZWxldGUoa2V5KTtcbiAgaWYgKGhhZEtleSkge1xuICAgIHRyaWdnZXIodGFyZ2V0LCBcImRlbGV0ZVwiLCBrZXksIHZvaWQgMCwgb2xkVmFsdWUpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBjbGVhcigpIHtcbiAgY29uc3QgdGFyZ2V0ID0gdG9SYXcodGhpcyk7XG4gIGNvbnN0IGhhZEl0ZW1zID0gdGFyZ2V0LnNpemUgIT09IDA7XG4gIGNvbnN0IG9sZFRhcmdldCA9IHRydWUgPyBpc01hcCh0YXJnZXQpID8gbmV3IE1hcCh0YXJnZXQpIDogbmV3IFNldCh0YXJnZXQpIDogdm9pZCAwO1xuICBjb25zdCByZXN1bHQgPSB0YXJnZXQuY2xlYXIoKTtcbiAgaWYgKGhhZEl0ZW1zKSB7XG4gICAgdHJpZ2dlcih0YXJnZXQsIFwiY2xlYXJcIiwgdm9pZCAwLCB2b2lkIDAsIG9sZFRhcmdldCk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUZvckVhY2goaXNSZWFkb25seSwgaXNTaGFsbG93KSB7XG4gIHJldHVybiBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgY29uc3Qgb2JzZXJ2ZWQgPSB0aGlzO1xuICAgIGNvbnN0IHRhcmdldCA9IG9ic2VydmVkW1xuICAgICAgXCJfX3ZfcmF3XCJcbiAgICAgIC8qIFJBVyAqL1xuICAgIF07XG4gICAgY29uc3QgcmF3VGFyZ2V0ID0gdG9SYXcodGFyZ2V0KTtcbiAgICBjb25zdCB3cmFwID0gaXNTaGFsbG93ID8gdG9TaGFsbG93IDogaXNSZWFkb25seSA/IHRvUmVhZG9ubHkgOiB0b1JlYWN0aXZlO1xuICAgICFpc1JlYWRvbmx5ICYmIHRyYWNrKHJhd1RhcmdldCwgXCJpdGVyYXRlXCIsIElURVJBVEVfS0VZKTtcbiAgICByZXR1cm4gdGFyZ2V0LmZvckVhY2goKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIHJldHVybiBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHdyYXAodmFsdWUpLCB3cmFwKGtleSksIG9ic2VydmVkKTtcbiAgICB9KTtcbiAgfTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUl0ZXJhYmxlTWV0aG9kKG1ldGhvZCwgaXNSZWFkb25seSwgaXNTaGFsbG93KSB7XG4gIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGhpc1tcbiAgICAgIFwiX192X3Jhd1wiXG4gICAgICAvKiBSQVcgKi9cbiAgICBdO1xuICAgIGNvbnN0IHJhd1RhcmdldCA9IHRvUmF3KHRhcmdldCk7XG4gICAgY29uc3QgdGFyZ2V0SXNNYXAgPSBpc01hcChyYXdUYXJnZXQpO1xuICAgIGNvbnN0IGlzUGFpciA9IG1ldGhvZCA9PT0gXCJlbnRyaWVzXCIgfHwgbWV0aG9kID09PSBTeW1ib2wuaXRlcmF0b3IgJiYgdGFyZ2V0SXNNYXA7XG4gICAgY29uc3QgaXNLZXlPbmx5ID0gbWV0aG9kID09PSBcImtleXNcIiAmJiB0YXJnZXRJc01hcDtcbiAgICBjb25zdCBpbm5lckl0ZXJhdG9yID0gdGFyZ2V0W21ldGhvZF0oLi4uYXJncyk7XG4gICAgY29uc3Qgd3JhcCA9IGlzU2hhbGxvdyA/IHRvU2hhbGxvdyA6IGlzUmVhZG9ubHkgPyB0b1JlYWRvbmx5IDogdG9SZWFjdGl2ZTtcbiAgICAhaXNSZWFkb25seSAmJiB0cmFjayhyYXdUYXJnZXQsIFwiaXRlcmF0ZVwiLCBpc0tleU9ubHkgPyBNQVBfS0VZX0lURVJBVEVfS0VZIDogSVRFUkFURV9LRVkpO1xuICAgIHJldHVybiB7XG4gICAgICAvLyBpdGVyYXRvciBwcm90b2NvbFxuICAgICAgbmV4dCgpIHtcbiAgICAgICAgY29uc3QgeyB2YWx1ZSwgZG9uZSB9ID0gaW5uZXJJdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHJldHVybiBkb25lID8geyB2YWx1ZSwgZG9uZSB9IDoge1xuICAgICAgICAgIHZhbHVlOiBpc1BhaXIgPyBbd3JhcCh2YWx1ZVswXSksIHdyYXAodmFsdWVbMV0pXSA6IHdyYXAodmFsdWUpLFxuICAgICAgICAgIGRvbmVcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICAvLyBpdGVyYWJsZSBwcm90b2NvbFxuICAgICAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgIH07XG4gIH07XG59XG5mdW5jdGlvbiBjcmVhdGVSZWFkb25seU1ldGhvZCh0eXBlKSB7XG4gIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgaWYgKHRydWUpIHtcbiAgICAgIGNvbnN0IGtleSA9IGFyZ3NbMF0gPyBgb24ga2V5IFwiJHthcmdzWzBdfVwiIGAgOiBgYDtcbiAgICAgIGNvbnNvbGUud2FybihgJHtjYXBpdGFsaXplKHR5cGUpfSBvcGVyYXRpb24gJHtrZXl9ZmFpbGVkOiB0YXJnZXQgaXMgcmVhZG9ubHkuYCwgdG9SYXcodGhpcykpO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZSA9PT0gXCJkZWxldGVcIiA/IGZhbHNlIDogdGhpcztcbiAgfTtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUluc3RydW1lbnRhdGlvbnMoKSB7XG4gIGNvbnN0IG11dGFibGVJbnN0cnVtZW50YXRpb25zMiA9IHtcbiAgICBnZXQoa2V5KSB7XG4gICAgICByZXR1cm4gZ2V0JDEodGhpcywga2V5KTtcbiAgICB9LFxuICAgIGdldCBzaXplKCkge1xuICAgICAgcmV0dXJuIHNpemUodGhpcyk7XG4gICAgfSxcbiAgICBoYXM6IGhhcyQxLFxuICAgIGFkZCxcbiAgICBzZXQ6IHNldCQxLFxuICAgIGRlbGV0ZTogZGVsZXRlRW50cnksXG4gICAgY2xlYXIsXG4gICAgZm9yRWFjaDogY3JlYXRlRm9yRWFjaChmYWxzZSwgZmFsc2UpXG4gIH07XG4gIGNvbnN0IHNoYWxsb3dJbnN0cnVtZW50YXRpb25zMiA9IHtcbiAgICBnZXQoa2V5KSB7XG4gICAgICByZXR1cm4gZ2V0JDEodGhpcywga2V5LCBmYWxzZSwgdHJ1ZSk7XG4gICAgfSxcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiBzaXplKHRoaXMpO1xuICAgIH0sXG4gICAgaGFzOiBoYXMkMSxcbiAgICBhZGQsXG4gICAgc2V0OiBzZXQkMSxcbiAgICBkZWxldGU6IGRlbGV0ZUVudHJ5LFxuICAgIGNsZWFyLFxuICAgIGZvckVhY2g6IGNyZWF0ZUZvckVhY2goZmFsc2UsIHRydWUpXG4gIH07XG4gIGNvbnN0IHJlYWRvbmx5SW5zdHJ1bWVudGF0aW9uczIgPSB7XG4gICAgZ2V0KGtleSkge1xuICAgICAgcmV0dXJuIGdldCQxKHRoaXMsIGtleSwgdHJ1ZSk7XG4gICAgfSxcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiBzaXplKHRoaXMsIHRydWUpO1xuICAgIH0sXG4gICAgaGFzKGtleSkge1xuICAgICAgcmV0dXJuIGhhcyQxLmNhbGwodGhpcywga2V5LCB0cnVlKTtcbiAgICB9LFxuICAgIGFkZDogY3JlYXRlUmVhZG9ubHlNZXRob2QoXG4gICAgICBcImFkZFwiXG4gICAgICAvKiBBREQgKi9cbiAgICApLFxuICAgIHNldDogY3JlYXRlUmVhZG9ubHlNZXRob2QoXG4gICAgICBcInNldFwiXG4gICAgICAvKiBTRVQgKi9cbiAgICApLFxuICAgIGRlbGV0ZTogY3JlYXRlUmVhZG9ubHlNZXRob2QoXG4gICAgICBcImRlbGV0ZVwiXG4gICAgICAvKiBERUxFVEUgKi9cbiAgICApLFxuICAgIGNsZWFyOiBjcmVhdGVSZWFkb25seU1ldGhvZChcbiAgICAgIFwiY2xlYXJcIlxuICAgICAgLyogQ0xFQVIgKi9cbiAgICApLFxuICAgIGZvckVhY2g6IGNyZWF0ZUZvckVhY2godHJ1ZSwgZmFsc2UpXG4gIH07XG4gIGNvbnN0IHNoYWxsb3dSZWFkb25seUluc3RydW1lbnRhdGlvbnMyID0ge1xuICAgIGdldChrZXkpIHtcbiAgICAgIHJldHVybiBnZXQkMSh0aGlzLCBrZXksIHRydWUsIHRydWUpO1xuICAgIH0sXG4gICAgZ2V0IHNpemUoKSB7XG4gICAgICByZXR1cm4gc2l6ZSh0aGlzLCB0cnVlKTtcbiAgICB9LFxuICAgIGhhcyhrZXkpIHtcbiAgICAgIHJldHVybiBoYXMkMS5jYWxsKHRoaXMsIGtleSwgdHJ1ZSk7XG4gICAgfSxcbiAgICBhZGQ6IGNyZWF0ZVJlYWRvbmx5TWV0aG9kKFxuICAgICAgXCJhZGRcIlxuICAgICAgLyogQUREICovXG4gICAgKSxcbiAgICBzZXQ6IGNyZWF0ZVJlYWRvbmx5TWV0aG9kKFxuICAgICAgXCJzZXRcIlxuICAgICAgLyogU0VUICovXG4gICAgKSxcbiAgICBkZWxldGU6IGNyZWF0ZVJlYWRvbmx5TWV0aG9kKFxuICAgICAgXCJkZWxldGVcIlxuICAgICAgLyogREVMRVRFICovXG4gICAgKSxcbiAgICBjbGVhcjogY3JlYXRlUmVhZG9ubHlNZXRob2QoXG4gICAgICBcImNsZWFyXCJcbiAgICAgIC8qIENMRUFSICovXG4gICAgKSxcbiAgICBmb3JFYWNoOiBjcmVhdGVGb3JFYWNoKHRydWUsIHRydWUpXG4gIH07XG4gIGNvbnN0IGl0ZXJhdG9yTWV0aG9kcyA9IFtcImtleXNcIiwgXCJ2YWx1ZXNcIiwgXCJlbnRyaWVzXCIsIFN5bWJvbC5pdGVyYXRvcl07XG4gIGl0ZXJhdG9yTWV0aG9kcy5mb3JFYWNoKChtZXRob2QpID0+IHtcbiAgICBtdXRhYmxlSW5zdHJ1bWVudGF0aW9uczJbbWV0aG9kXSA9IGNyZWF0ZUl0ZXJhYmxlTWV0aG9kKG1ldGhvZCwgZmFsc2UsIGZhbHNlKTtcbiAgICByZWFkb25seUluc3RydW1lbnRhdGlvbnMyW21ldGhvZF0gPSBjcmVhdGVJdGVyYWJsZU1ldGhvZChtZXRob2QsIHRydWUsIGZhbHNlKTtcbiAgICBzaGFsbG93SW5zdHJ1bWVudGF0aW9uczJbbWV0aG9kXSA9IGNyZWF0ZUl0ZXJhYmxlTWV0aG9kKG1ldGhvZCwgZmFsc2UsIHRydWUpO1xuICAgIHNoYWxsb3dSZWFkb25seUluc3RydW1lbnRhdGlvbnMyW21ldGhvZF0gPSBjcmVhdGVJdGVyYWJsZU1ldGhvZChtZXRob2QsIHRydWUsIHRydWUpO1xuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBtdXRhYmxlSW5zdHJ1bWVudGF0aW9uczIsXG4gICAgcmVhZG9ubHlJbnN0cnVtZW50YXRpb25zMixcbiAgICBzaGFsbG93SW5zdHJ1bWVudGF0aW9uczIsXG4gICAgc2hhbGxvd1JlYWRvbmx5SW5zdHJ1bWVudGF0aW9uczJcbiAgXTtcbn1cbnZhciBbbXV0YWJsZUluc3RydW1lbnRhdGlvbnMsIHJlYWRvbmx5SW5zdHJ1bWVudGF0aW9ucywgc2hhbGxvd0luc3RydW1lbnRhdGlvbnMsIHNoYWxsb3dSZWFkb25seUluc3RydW1lbnRhdGlvbnNdID0gLyogQF9fUFVSRV9fICovIGNyZWF0ZUluc3RydW1lbnRhdGlvbnMoKTtcbmZ1bmN0aW9uIGNyZWF0ZUluc3RydW1lbnRhdGlvbkdldHRlcihpc1JlYWRvbmx5LCBzaGFsbG93KSB7XG4gIGNvbnN0IGluc3RydW1lbnRhdGlvbnMgPSBzaGFsbG93ID8gaXNSZWFkb25seSA/IHNoYWxsb3dSZWFkb25seUluc3RydW1lbnRhdGlvbnMgOiBzaGFsbG93SW5zdHJ1bWVudGF0aW9ucyA6IGlzUmVhZG9ubHkgPyByZWFkb25seUluc3RydW1lbnRhdGlvbnMgOiBtdXRhYmxlSW5zdHJ1bWVudGF0aW9ucztcbiAgcmV0dXJuICh0YXJnZXQsIGtleSwgcmVjZWl2ZXIpID0+IHtcbiAgICBpZiAoa2V5ID09PSBcIl9fdl9pc1JlYWN0aXZlXCIpIHtcbiAgICAgIHJldHVybiAhaXNSZWFkb25seTtcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJfX3ZfaXNSZWFkb25seVwiKSB7XG4gICAgICByZXR1cm4gaXNSZWFkb25seTtcbiAgICB9IGVsc2UgaWYgKGtleSA9PT0gXCJfX3ZfcmF3XCIpIHtcbiAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfVxuICAgIHJldHVybiBSZWZsZWN0LmdldChoYXNPd24oaW5zdHJ1bWVudGF0aW9ucywga2V5KSAmJiBrZXkgaW4gdGFyZ2V0ID8gaW5zdHJ1bWVudGF0aW9ucyA6IHRhcmdldCwga2V5LCByZWNlaXZlcik7XG4gIH07XG59XG52YXIgbXV0YWJsZUNvbGxlY3Rpb25IYW5kbGVycyA9IHtcbiAgZ2V0OiAvKiBAX19QVVJFX18gKi8gY3JlYXRlSW5zdHJ1bWVudGF0aW9uR2V0dGVyKGZhbHNlLCBmYWxzZSlcbn07XG52YXIgcmVhZG9ubHlDb2xsZWN0aW9uSGFuZGxlcnMgPSB7XG4gIGdldDogLyogQF9fUFVSRV9fICovIGNyZWF0ZUluc3RydW1lbnRhdGlvbkdldHRlcih0cnVlLCBmYWxzZSlcbn07XG5mdW5jdGlvbiBjaGVja0lkZW50aXR5S2V5cyh0YXJnZXQsIGhhczIsIGtleSkge1xuICBjb25zdCByYXdLZXkgPSB0b1JhdyhrZXkpO1xuICBpZiAocmF3S2V5ICE9PSBrZXkgJiYgaGFzMi5jYWxsKHRhcmdldCwgcmF3S2V5KSkge1xuICAgIGNvbnN0IHR5cGUgPSB0b1Jhd1R5cGUodGFyZ2V0KTtcbiAgICBjb25zb2xlLndhcm4oYFJlYWN0aXZlICR7dHlwZX0gY29udGFpbnMgYm90aCB0aGUgcmF3IGFuZCByZWFjdGl2ZSB2ZXJzaW9ucyBvZiB0aGUgc2FtZSBvYmplY3Qke3R5cGUgPT09IGBNYXBgID8gYCBhcyBrZXlzYCA6IGBgfSwgd2hpY2ggY2FuIGxlYWQgdG8gaW5jb25zaXN0ZW5jaWVzLiBBdm9pZCBkaWZmZXJlbnRpYXRpbmcgYmV0d2VlbiB0aGUgcmF3IGFuZCByZWFjdGl2ZSB2ZXJzaW9ucyBvZiBhbiBvYmplY3QgYW5kIG9ubHkgdXNlIHRoZSByZWFjdGl2ZSB2ZXJzaW9uIGlmIHBvc3NpYmxlLmApO1xuICB9XG59XG52YXIgcmVhY3RpdmVNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IFdlYWtNYXAoKTtcbnZhciBzaGFsbG93UmVhY3RpdmVNYXAgPSAvKiBAX19QVVJFX18gKi8gbmV3IFdlYWtNYXAoKTtcbnZhciByZWFkb25seU1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgV2Vha01hcCgpO1xudmFyIHNoYWxsb3dSZWFkb25seU1hcCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgV2Vha01hcCgpO1xuZnVuY3Rpb24gdGFyZ2V0VHlwZU1hcChyYXdUeXBlKSB7XG4gIHN3aXRjaCAocmF3VHlwZSkge1xuICAgIGNhc2UgXCJPYmplY3RcIjpcbiAgICBjYXNlIFwiQXJyYXlcIjpcbiAgICAgIHJldHVybiAxO1xuICAgIGNhc2UgXCJNYXBcIjpcbiAgICBjYXNlIFwiU2V0XCI6XG4gICAgY2FzZSBcIldlYWtNYXBcIjpcbiAgICBjYXNlIFwiV2Vha1NldFwiOlxuICAgICAgcmV0dXJuIDI7XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAwO1xuICB9XG59XG5mdW5jdGlvbiBnZXRUYXJnZXRUeXBlKHZhbHVlKSB7XG4gIHJldHVybiB2YWx1ZVtcbiAgICBcIl9fdl9za2lwXCJcbiAgICAvKiBTS0lQICovXG4gIF0gfHwgIU9iamVjdC5pc0V4dGVuc2libGUodmFsdWUpID8gMCA6IHRhcmdldFR5cGVNYXAodG9SYXdUeXBlKHZhbHVlKSk7XG59XG5mdW5jdGlvbiByZWFjdGl2ZTIodGFyZ2V0KSB7XG4gIGlmICh0YXJnZXQgJiYgdGFyZ2V0W1xuICAgIFwiX192X2lzUmVhZG9ubHlcIlxuICAgIC8qIElTX1JFQURPTkxZICovXG4gIF0pIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIHJldHVybiBjcmVhdGVSZWFjdGl2ZU9iamVjdCh0YXJnZXQsIGZhbHNlLCBtdXRhYmxlSGFuZGxlcnMsIG11dGFibGVDb2xsZWN0aW9uSGFuZGxlcnMsIHJlYWN0aXZlTWFwKTtcbn1cbmZ1bmN0aW9uIHJlYWRvbmx5KHRhcmdldCkge1xuICByZXR1cm4gY3JlYXRlUmVhY3RpdmVPYmplY3QodGFyZ2V0LCB0cnVlLCByZWFkb25seUhhbmRsZXJzLCByZWFkb25seUNvbGxlY3Rpb25IYW5kbGVycywgcmVhZG9ubHlNYXApO1xufVxuZnVuY3Rpb24gY3JlYXRlUmVhY3RpdmVPYmplY3QodGFyZ2V0LCBpc1JlYWRvbmx5LCBiYXNlSGFuZGxlcnMsIGNvbGxlY3Rpb25IYW5kbGVycywgcHJveHlNYXApIHtcbiAgaWYgKCFpc09iamVjdCh0YXJnZXQpKSB7XG4gICAgaWYgKHRydWUpIHtcbiAgICAgIGNvbnNvbGUud2FybihgdmFsdWUgY2Fubm90IGJlIG1hZGUgcmVhY3RpdmU6ICR7U3RyaW5nKHRhcmdldCl9YCk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbiAgaWYgKHRhcmdldFtcbiAgICBcIl9fdl9yYXdcIlxuICAgIC8qIFJBVyAqL1xuICBdICYmICEoaXNSZWFkb25seSAmJiB0YXJnZXRbXG4gICAgXCJfX3ZfaXNSZWFjdGl2ZVwiXG4gICAgLyogSVNfUkVBQ1RJVkUgKi9cbiAgXSkpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGNvbnN0IGV4aXN0aW5nUHJveHkgPSBwcm94eU1hcC5nZXQodGFyZ2V0KTtcbiAgaWYgKGV4aXN0aW5nUHJveHkpIHtcbiAgICByZXR1cm4gZXhpc3RpbmdQcm94eTtcbiAgfVxuICBjb25zdCB0YXJnZXRUeXBlID0gZ2V0VGFyZ2V0VHlwZSh0YXJnZXQpO1xuICBpZiAodGFyZ2V0VHlwZSA9PT0gMCkge1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbiAgY29uc3QgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCB0YXJnZXRUeXBlID09PSAyID8gY29sbGVjdGlvbkhhbmRsZXJzIDogYmFzZUhhbmRsZXJzKTtcbiAgcHJveHlNYXAuc2V0KHRhcmdldCwgcHJveHkpO1xuICByZXR1cm4gcHJveHk7XG59XG5mdW5jdGlvbiB0b1JhdyhvYnNlcnZlZCkge1xuICByZXR1cm4gb2JzZXJ2ZWQgJiYgdG9SYXcob2JzZXJ2ZWRbXG4gICAgXCJfX3ZfcmF3XCJcbiAgICAvKiBSQVcgKi9cbiAgXSkgfHwgb2JzZXJ2ZWQ7XG59XG5mdW5jdGlvbiBpc1JlZihyKSB7XG4gIHJldHVybiBCb29sZWFuKHIgJiYgci5fX3ZfaXNSZWYgPT09IHRydWUpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvbWFnaWNzLyRuZXh0VGljay5qc1xubWFnaWMoXCJuZXh0VGlja1wiLCAoKSA9PiBuZXh0VGljayk7XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9tYWdpY3MvJGRpc3BhdGNoLmpzXG5tYWdpYyhcImRpc3BhdGNoXCIsIChlbCkgPT4gZGlzcGF0Y2guYmluZChkaXNwYXRjaCwgZWwpKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kd2F0Y2guanNcbm1hZ2ljKFwid2F0Y2hcIiwgKGVsLCB7IGV2YWx1YXRlTGF0ZXI6IGV2YWx1YXRlTGF0ZXIyLCBjbGVhbnVwOiBjbGVhbnVwMiB9KSA9PiAoa2V5LCBjYWxsYmFjaykgPT4ge1xuICBsZXQgZXZhbHVhdGUyID0gZXZhbHVhdGVMYXRlcjIoa2V5KTtcbiAgbGV0IGdldHRlciA9ICgpID0+IHtcbiAgICBsZXQgdmFsdWU7XG4gICAgZXZhbHVhdGUyKChpKSA9PiB2YWx1ZSA9IGkpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbiAgbGV0IHVud2F0Y2ggPSB3YXRjaChnZXR0ZXIsIGNhbGxiYWNrKTtcbiAgY2xlYW51cDIodW53YXRjaCk7XG59KTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kc3RvcmUuanNcbm1hZ2ljKFwic3RvcmVcIiwgZ2V0U3RvcmVzKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kZGF0YS5qc1xubWFnaWMoXCJkYXRhXCIsIChlbCkgPT4gc2NvcGUoZWwpKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kcm9vdC5qc1xubWFnaWMoXCJyb290XCIsIChlbCkgPT4gY2xvc2VzdFJvb3QoZWwpKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kcmVmcy5qc1xubWFnaWMoXCJyZWZzXCIsIChlbCkgPT4ge1xuICBpZiAoZWwuX3hfcmVmc19wcm94eSlcbiAgICByZXR1cm4gZWwuX3hfcmVmc19wcm94eTtcbiAgZWwuX3hfcmVmc19wcm94eSA9IG1lcmdlUHJveGllcyhnZXRBcnJheU9mUmVmT2JqZWN0KGVsKSk7XG4gIHJldHVybiBlbC5feF9yZWZzX3Byb3h5O1xufSk7XG5mdW5jdGlvbiBnZXRBcnJheU9mUmVmT2JqZWN0KGVsKSB7XG4gIGxldCByZWZPYmplY3RzID0gW107XG4gIGZpbmRDbG9zZXN0KGVsLCAoaSkgPT4ge1xuICAgIGlmIChpLl94X3JlZnMpXG4gICAgICByZWZPYmplY3RzLnB1c2goaS5feF9yZWZzKTtcbiAgfSk7XG4gIHJldHVybiByZWZPYmplY3RzO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvaWRzLmpzXG52YXIgZ2xvYmFsSWRNZW1vID0ge307XG5mdW5jdGlvbiBmaW5kQW5kSW5jcmVtZW50SWQobmFtZSkge1xuICBpZiAoIWdsb2JhbElkTWVtb1tuYW1lXSlcbiAgICBnbG9iYWxJZE1lbW9bbmFtZV0gPSAwO1xuICByZXR1cm4gKytnbG9iYWxJZE1lbW9bbmFtZV07XG59XG5mdW5jdGlvbiBjbG9zZXN0SWRSb290KGVsLCBuYW1lKSB7XG4gIHJldHVybiBmaW5kQ2xvc2VzdChlbCwgKGVsZW1lbnQpID0+IHtcbiAgICBpZiAoZWxlbWVudC5feF9pZHMgJiYgZWxlbWVudC5feF9pZHNbbmFtZV0pXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgfSk7XG59XG5mdW5jdGlvbiBzZXRJZFJvb3QoZWwsIG5hbWUpIHtcbiAgaWYgKCFlbC5feF9pZHMpXG4gICAgZWwuX3hfaWRzID0ge307XG4gIGlmICghZWwuX3hfaWRzW25hbWVdKVxuICAgIGVsLl94X2lkc1tuYW1lXSA9IGZpbmRBbmRJbmNyZW1lbnRJZChuYW1lKTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL21hZ2ljcy8kaWQuanNcbm1hZ2ljKFwiaWRcIiwgKGVsLCB7IGNsZWFudXA6IGNsZWFudXAyIH0pID0+IChuYW1lLCBrZXkgPSBudWxsKSA9PiB7XG4gIGxldCBjYWNoZUtleSA9IGAke25hbWV9JHtrZXkgPyBgLSR7a2V5fWAgOiBcIlwifWA7XG4gIHJldHVybiBjYWNoZUlkQnlOYW1lT25FbGVtZW50KGVsLCBjYWNoZUtleSwgY2xlYW51cDIsICgpID0+IHtcbiAgICBsZXQgcm9vdCA9IGNsb3Nlc3RJZFJvb3QoZWwsIG5hbWUpO1xuICAgIGxldCBpZCA9IHJvb3QgPyByb290Ll94X2lkc1tuYW1lXSA6IGZpbmRBbmRJbmNyZW1lbnRJZChuYW1lKTtcbiAgICByZXR1cm4ga2V5ID8gYCR7bmFtZX0tJHtpZH0tJHtrZXl9YCA6IGAke25hbWV9LSR7aWR9YDtcbiAgfSk7XG59KTtcbmludGVyY2VwdENsb25lKChmcm9tLCB0bykgPT4ge1xuICBpZiAoZnJvbS5feF9pZCkge1xuICAgIHRvLl94X2lkID0gZnJvbS5feF9pZDtcbiAgfVxufSk7XG5mdW5jdGlvbiBjYWNoZUlkQnlOYW1lT25FbGVtZW50KGVsLCBjYWNoZUtleSwgY2xlYW51cDIsIGNhbGxiYWNrKSB7XG4gIGlmICghZWwuX3hfaWQpXG4gICAgZWwuX3hfaWQgPSB7fTtcbiAgaWYgKGVsLl94X2lkW2NhY2hlS2V5XSlcbiAgICByZXR1cm4gZWwuX3hfaWRbY2FjaGVLZXldO1xuICBsZXQgb3V0cHV0ID0gY2FsbGJhY2soKTtcbiAgZWwuX3hfaWRbY2FjaGVLZXldID0gb3V0cHV0O1xuICBjbGVhbnVwMigoKSA9PiB7XG4gICAgZGVsZXRlIGVsLl94X2lkW2NhY2hlS2V5XTtcbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9tYWdpY3MvJGVsLmpzXG5tYWdpYyhcImVsXCIsIChlbCkgPT4gZWwpO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvbWFnaWNzL2luZGV4LmpzXG53YXJuTWlzc2luZ1BsdWdpbk1hZ2ljKFwiRm9jdXNcIiwgXCJmb2N1c1wiLCBcImZvY3VzXCIpO1xud2Fybk1pc3NpbmdQbHVnaW5NYWdpYyhcIlBlcnNpc3RcIiwgXCJwZXJzaXN0XCIsIFwicGVyc2lzdFwiKTtcbmZ1bmN0aW9uIHdhcm5NaXNzaW5nUGx1Z2luTWFnaWMobmFtZSwgbWFnaWNOYW1lLCBzbHVnKSB7XG4gIG1hZ2ljKG1hZ2ljTmFtZSwgKGVsKSA9PiB3YXJuKGBZb3UgY2FuJ3QgdXNlIFskJHttYWdpY05hbWV9XSB3aXRob3V0IGZpcnN0IGluc3RhbGxpbmcgdGhlIFwiJHtuYW1lfVwiIHBsdWdpbiBoZXJlOiBodHRwczovL2FscGluZWpzLmRldi9wbHVnaW5zLyR7c2x1Z31gLCBlbCkpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LW1vZGVsYWJsZS5qc1xuZGlyZWN0aXZlKFwibW9kZWxhYmxlXCIsIChlbCwgeyBleHByZXNzaW9uIH0sIHsgZWZmZWN0OiBlZmZlY3QzLCBldmFsdWF0ZUxhdGVyOiBldmFsdWF0ZUxhdGVyMiwgY2xlYW51cDogY2xlYW51cDIgfSkgPT4ge1xuICBsZXQgZnVuYyA9IGV2YWx1YXRlTGF0ZXIyKGV4cHJlc3Npb24pO1xuICBsZXQgaW5uZXJHZXQgPSAoKSA9PiB7XG4gICAgbGV0IHJlc3VsdDtcbiAgICBmdW5jKChpKSA9PiByZXN1bHQgPSBpKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICBsZXQgZXZhbHVhdGVJbm5lclNldCA9IGV2YWx1YXRlTGF0ZXIyKGAke2V4cHJlc3Npb259ID0gX19wbGFjZWhvbGRlcmApO1xuICBsZXQgaW5uZXJTZXQgPSAodmFsKSA9PiBldmFsdWF0ZUlubmVyU2V0KCgpID0+IHtcbiAgfSwgeyBzY29wZTogeyBcIl9fcGxhY2Vob2xkZXJcIjogdmFsIH0gfSk7XG4gIGxldCBpbml0aWFsVmFsdWUgPSBpbm5lckdldCgpO1xuICBpbm5lclNldChpbml0aWFsVmFsdWUpO1xuICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB7XG4gICAgaWYgKCFlbC5feF9tb2RlbClcbiAgICAgIHJldHVybjtcbiAgICBlbC5feF9yZW1vdmVNb2RlbExpc3RlbmVyc1tcImRlZmF1bHRcIl0oKTtcbiAgICBsZXQgb3V0ZXJHZXQgPSBlbC5feF9tb2RlbC5nZXQ7XG4gICAgbGV0IG91dGVyU2V0ID0gZWwuX3hfbW9kZWwuc2V0O1xuICAgIGxldCByZWxlYXNlRW50YW5nbGVtZW50ID0gZW50YW5nbGUoXG4gICAgICB7XG4gICAgICAgIGdldCgpIHtcbiAgICAgICAgICByZXR1cm4gb3V0ZXJHZXQoKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0KHZhbHVlKSB7XG4gICAgICAgICAgb3V0ZXJTZXQodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBnZXQoKSB7XG4gICAgICAgICAgcmV0dXJuIGlubmVyR2V0KCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldCh2YWx1ZSkge1xuICAgICAgICAgIGlubmVyU2V0KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICk7XG4gICAgY2xlYW51cDIocmVsZWFzZUVudGFuZ2xlbWVudCk7XG4gIH0pO1xufSk7XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9kaXJlY3RpdmVzL3gtdGVsZXBvcnQuanNcbmRpcmVjdGl2ZShcInRlbGVwb3J0XCIsIChlbCwgeyBtb2RpZmllcnMsIGV4cHJlc3Npb24gfSwgeyBjbGVhbnVwOiBjbGVhbnVwMiB9KSA9PiB7XG4gIGlmIChlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT09IFwidGVtcGxhdGVcIilcbiAgICB3YXJuKFwieC10ZWxlcG9ydCBjYW4gb25seSBiZSB1c2VkIG9uIGEgPHRlbXBsYXRlPiB0YWdcIiwgZWwpO1xuICBsZXQgdGFyZ2V0ID0gZ2V0VGFyZ2V0KGV4cHJlc3Npb24pO1xuICBsZXQgY2xvbmUyID0gZWwuY29udGVudC5jbG9uZU5vZGUodHJ1ZSkuZmlyc3RFbGVtZW50Q2hpbGQ7XG4gIGVsLl94X3RlbGVwb3J0ID0gY2xvbmUyO1xuICBjbG9uZTIuX3hfdGVsZXBvcnRCYWNrID0gZWw7XG4gIGVsLnNldEF0dHJpYnV0ZShcImRhdGEtdGVsZXBvcnQtdGVtcGxhdGVcIiwgdHJ1ZSk7XG4gIGNsb25lMi5zZXRBdHRyaWJ1dGUoXCJkYXRhLXRlbGVwb3J0LXRhcmdldFwiLCB0cnVlKTtcbiAgaWYgKGVsLl94X2ZvcndhcmRFdmVudHMpIHtcbiAgICBlbC5feF9mb3J3YXJkRXZlbnRzLmZvckVhY2goKGV2ZW50TmFtZSkgPT4ge1xuICAgICAgY2xvbmUyLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCAoZSkgPT4ge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlbC5kaXNwYXRjaEV2ZW50KG5ldyBlLmNvbnN0cnVjdG9yKGUudHlwZSwgZSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgYWRkU2NvcGVUb05vZGUoY2xvbmUyLCB7fSwgZWwpO1xuICBsZXQgcGxhY2VJbkRvbSA9IChjbG9uZTMsIHRhcmdldDIsIG1vZGlmaWVyczIpID0+IHtcbiAgICBpZiAobW9kaWZpZXJzMi5pbmNsdWRlcyhcInByZXBlbmRcIikpIHtcbiAgICAgIHRhcmdldDIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY2xvbmUzLCB0YXJnZXQyKTtcbiAgICB9IGVsc2UgaWYgKG1vZGlmaWVyczIuaW5jbHVkZXMoXCJhcHBlbmRcIikpIHtcbiAgICAgIHRhcmdldDIucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoY2xvbmUzLCB0YXJnZXQyLm5leHRTaWJsaW5nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0Mi5hcHBlbmRDaGlsZChjbG9uZTMpO1xuICAgIH1cbiAgfTtcbiAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICBwbGFjZUluRG9tKGNsb25lMiwgdGFyZ2V0LCBtb2RpZmllcnMpO1xuICAgIHNraXBEdXJpbmdDbG9uZSgoKSA9PiB7XG4gICAgICBpbml0VHJlZShjbG9uZTIpO1xuICAgICAgY2xvbmUyLl94X2lnbm9yZSA9IHRydWU7XG4gICAgfSkoKTtcbiAgfSk7XG4gIGVsLl94X3RlbGVwb3J0UHV0QmFjayA9ICgpID0+IHtcbiAgICBsZXQgdGFyZ2V0MiA9IGdldFRhcmdldChleHByZXNzaW9uKTtcbiAgICBtdXRhdGVEb20oKCkgPT4ge1xuICAgICAgcGxhY2VJbkRvbShlbC5feF90ZWxlcG9ydCwgdGFyZ2V0MiwgbW9kaWZpZXJzKTtcbiAgICB9KTtcbiAgfTtcbiAgY2xlYW51cDIoKCkgPT4gY2xvbmUyLnJlbW92ZSgpKTtcbn0pO1xudmFyIHRlbGVwb3J0Q29udGFpbmVyRHVyaW5nQ2xvbmUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuZnVuY3Rpb24gZ2V0VGFyZ2V0KGV4cHJlc3Npb24pIHtcbiAgbGV0IHRhcmdldCA9IHNraXBEdXJpbmdDbG9uZSgoKSA9PiB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZXhwcmVzc2lvbik7XG4gIH0sICgpID0+IHtcbiAgICByZXR1cm4gdGVsZXBvcnRDb250YWluZXJEdXJpbmdDbG9uZTtcbiAgfSkoKTtcbiAgaWYgKCF0YXJnZXQpXG4gICAgd2FybihgQ2Fubm90IGZpbmQgeC10ZWxlcG9ydCBlbGVtZW50IGZvciBzZWxlY3RvcjogXCIke2V4cHJlc3Npb259XCJgKTtcbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RpcmVjdGl2ZXMveC1pZ25vcmUuanNcbnZhciBoYW5kbGVyID0gKCkgPT4ge1xufTtcbmhhbmRsZXIuaW5saW5lID0gKGVsLCB7IG1vZGlmaWVycyB9LCB7IGNsZWFudXA6IGNsZWFudXAyIH0pID0+IHtcbiAgbW9kaWZpZXJzLmluY2x1ZGVzKFwic2VsZlwiKSA/IGVsLl94X2lnbm9yZVNlbGYgPSB0cnVlIDogZWwuX3hfaWdub3JlID0gdHJ1ZTtcbiAgY2xlYW51cDIoKCkgPT4ge1xuICAgIG1vZGlmaWVycy5pbmNsdWRlcyhcInNlbGZcIikgPyBkZWxldGUgZWwuX3hfaWdub3JlU2VsZiA6IGRlbGV0ZSBlbC5feF9pZ25vcmU7XG4gIH0pO1xufTtcbmRpcmVjdGl2ZShcImlnbm9yZVwiLCBoYW5kbGVyKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RpcmVjdGl2ZXMveC1lZmZlY3QuanNcbmRpcmVjdGl2ZShcImVmZmVjdFwiLCBza2lwRHVyaW5nQ2xvbmUoKGVsLCB7IGV4cHJlc3Npb24gfSwgeyBlZmZlY3Q6IGVmZmVjdDMgfSkgPT4ge1xuICBlZmZlY3QzKGV2YWx1YXRlTGF0ZXIoZWwsIGV4cHJlc3Npb24pKTtcbn0pKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL3V0aWxzL29uLmpzXG5mdW5jdGlvbiBvbihlbCwgZXZlbnQsIG1vZGlmaWVycywgY2FsbGJhY2spIHtcbiAgbGV0IGxpc3RlbmVyVGFyZ2V0ID0gZWw7XG4gIGxldCBoYW5kbGVyNCA9IChlKSA9PiBjYWxsYmFjayhlKTtcbiAgbGV0IG9wdGlvbnMgPSB7fTtcbiAgbGV0IHdyYXBIYW5kbGVyID0gKGNhbGxiYWNrMiwgd3JhcHBlcikgPT4gKGUpID0+IHdyYXBwZXIoY2FsbGJhY2syLCBlKTtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImRvdFwiKSlcbiAgICBldmVudCA9IGRvdFN5bnRheChldmVudCk7XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJjYW1lbFwiKSlcbiAgICBldmVudCA9IGNhbWVsQ2FzZTIoZXZlbnQpO1xuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwicGFzc2l2ZVwiKSlcbiAgICBvcHRpb25zLnBhc3NpdmUgPSB0cnVlO1xuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwiY2FwdHVyZVwiKSlcbiAgICBvcHRpb25zLmNhcHR1cmUgPSB0cnVlO1xuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwid2luZG93XCIpKVxuICAgIGxpc3RlbmVyVGFyZ2V0ID0gd2luZG93O1xuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwiZG9jdW1lbnRcIikpXG4gICAgbGlzdGVuZXJUYXJnZXQgPSBkb2N1bWVudDtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImRlYm91bmNlXCIpKSB7XG4gICAgbGV0IG5leHRNb2RpZmllciA9IG1vZGlmaWVyc1ttb2RpZmllcnMuaW5kZXhPZihcImRlYm91bmNlXCIpICsgMV0gfHwgXCJpbnZhbGlkLXdhaXRcIjtcbiAgICBsZXQgd2FpdCA9IGlzTnVtZXJpYyhuZXh0TW9kaWZpZXIuc3BsaXQoXCJtc1wiKVswXSkgPyBOdW1iZXIobmV4dE1vZGlmaWVyLnNwbGl0KFwibXNcIilbMF0pIDogMjUwO1xuICAgIGhhbmRsZXI0ID0gZGVib3VuY2UoaGFuZGxlcjQsIHdhaXQpO1xuICB9XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJ0aHJvdHRsZVwiKSkge1xuICAgIGxldCBuZXh0TW9kaWZpZXIgPSBtb2RpZmllcnNbbW9kaWZpZXJzLmluZGV4T2YoXCJ0aHJvdHRsZVwiKSArIDFdIHx8IFwiaW52YWxpZC13YWl0XCI7XG4gICAgbGV0IHdhaXQgPSBpc051bWVyaWMobmV4dE1vZGlmaWVyLnNwbGl0KFwibXNcIilbMF0pID8gTnVtYmVyKG5leHRNb2RpZmllci5zcGxpdChcIm1zXCIpWzBdKSA6IDI1MDtcbiAgICBoYW5kbGVyNCA9IHRocm90dGxlKGhhbmRsZXI0LCB3YWl0KTtcbiAgfVxuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwicHJldmVudFwiKSlcbiAgICBoYW5kbGVyNCA9IHdyYXBIYW5kbGVyKGhhbmRsZXI0LCAobmV4dCwgZSkgPT4ge1xuICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgbmV4dChlKTtcbiAgICB9KTtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcInN0b3BcIikpXG4gICAgaGFuZGxlcjQgPSB3cmFwSGFuZGxlcihoYW5kbGVyNCwgKG5leHQsIGUpID0+IHtcbiAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICBuZXh0KGUpO1xuICAgIH0pO1xuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwib25jZVwiKSkge1xuICAgIGhhbmRsZXI0ID0gd3JhcEhhbmRsZXIoaGFuZGxlcjQsIChuZXh0LCBlKSA9PiB7XG4gICAgICBuZXh0KGUpO1xuICAgICAgbGlzdGVuZXJUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcjQsIG9wdGlvbnMpO1xuICAgIH0pO1xuICB9XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJhd2F5XCIpIHx8IG1vZGlmaWVycy5pbmNsdWRlcyhcIm91dHNpZGVcIikpIHtcbiAgICBsaXN0ZW5lclRhcmdldCA9IGRvY3VtZW50O1xuICAgIGhhbmRsZXI0ID0gd3JhcEhhbmRsZXIoaGFuZGxlcjQsIChuZXh0LCBlKSA9PiB7XG4gICAgICBpZiAoZWwuY29udGFpbnMoZS50YXJnZXQpKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoZS50YXJnZXQuaXNDb25uZWN0ZWQgPT09IGZhbHNlKVxuICAgICAgICByZXR1cm47XG4gICAgICBpZiAoZWwub2Zmc2V0V2lkdGggPCAxICYmIGVsLm9mZnNldEhlaWdodCA8IDEpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGlmIChlbC5feF9pc1Nob3duID09PSBmYWxzZSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgbmV4dChlKTtcbiAgICB9KTtcbiAgfVxuICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwic2VsZlwiKSlcbiAgICBoYW5kbGVyNCA9IHdyYXBIYW5kbGVyKGhhbmRsZXI0LCAobmV4dCwgZSkgPT4ge1xuICAgICAgZS50YXJnZXQgPT09IGVsICYmIG5leHQoZSk7XG4gICAgfSk7XG4gIGlmIChpc0tleUV2ZW50KGV2ZW50KSB8fCBpc0NsaWNrRXZlbnQoZXZlbnQpKSB7XG4gICAgaGFuZGxlcjQgPSB3cmFwSGFuZGxlcihoYW5kbGVyNCwgKG5leHQsIGUpID0+IHtcbiAgICAgIGlmIChpc0xpc3RlbmluZ0ZvckFTcGVjaWZpY0tleVRoYXRIYXNudEJlZW5QcmVzc2VkKGUsIG1vZGlmaWVycykpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbmV4dChlKTtcbiAgICB9KTtcbiAgfVxuICBsaXN0ZW5lclRhcmdldC5hZGRFdmVudExpc3RlbmVyKGV2ZW50LCBoYW5kbGVyNCwgb3B0aW9ucyk7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgbGlzdGVuZXJUYXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudCwgaGFuZGxlcjQsIG9wdGlvbnMpO1xuICB9O1xufVxuZnVuY3Rpb24gZG90U3ludGF4KHN1YmplY3QpIHtcbiAgcmV0dXJuIHN1YmplY3QucmVwbGFjZSgvLS9nLCBcIi5cIik7XG59XG5mdW5jdGlvbiBjYW1lbENhc2UyKHN1YmplY3QpIHtcbiAgcmV0dXJuIHN1YmplY3QudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8tKFxcdykvZywgKG1hdGNoLCBjaGFyKSA9PiBjaGFyLnRvVXBwZXJDYXNlKCkpO1xufVxuZnVuY3Rpb24gaXNOdW1lcmljKHN1YmplY3QpIHtcbiAgcmV0dXJuICFBcnJheS5pc0FycmF5KHN1YmplY3QpICYmICFpc05hTihzdWJqZWN0KTtcbn1cbmZ1bmN0aW9uIGtlYmFiQ2FzZTIoc3ViamVjdCkge1xuICBpZiAoW1wiIFwiLCBcIl9cIl0uaW5jbHVkZXMoXG4gICAgc3ViamVjdFxuICApKVxuICAgIHJldHVybiBzdWJqZWN0O1xuICByZXR1cm4gc3ViamVjdC5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCBcIiQxLSQyXCIpLnJlcGxhY2UoL1tfXFxzXS8sIFwiLVwiKS50b0xvd2VyQ2FzZSgpO1xufVxuZnVuY3Rpb24gaXNLZXlFdmVudChldmVudCkge1xuICByZXR1cm4gW1wia2V5ZG93blwiLCBcImtleXVwXCJdLmluY2x1ZGVzKGV2ZW50KTtcbn1cbmZ1bmN0aW9uIGlzQ2xpY2tFdmVudChldmVudCkge1xuICByZXR1cm4gW1wiY29udGV4dG1lbnVcIiwgXCJjbGlja1wiLCBcIm1vdXNlXCJdLnNvbWUoKGkpID0+IGV2ZW50LmluY2x1ZGVzKGkpKTtcbn1cbmZ1bmN0aW9uIGlzTGlzdGVuaW5nRm9yQVNwZWNpZmljS2V5VGhhdEhhc250QmVlblByZXNzZWQoZSwgbW9kaWZpZXJzKSB7XG4gIGxldCBrZXlNb2RpZmllcnMgPSBtb2RpZmllcnMuZmlsdGVyKChpKSA9PiB7XG4gICAgcmV0dXJuICFbXCJ3aW5kb3dcIiwgXCJkb2N1bWVudFwiLCBcInByZXZlbnRcIiwgXCJzdG9wXCIsIFwib25jZVwiLCBcImNhcHR1cmVcIiwgXCJzZWxmXCIsIFwiYXdheVwiLCBcIm91dHNpZGVcIiwgXCJwYXNzaXZlXCJdLmluY2x1ZGVzKGkpO1xuICB9KTtcbiAgaWYgKGtleU1vZGlmaWVycy5pbmNsdWRlcyhcImRlYm91bmNlXCIpKSB7XG4gICAgbGV0IGRlYm91bmNlSW5kZXggPSBrZXlNb2RpZmllcnMuaW5kZXhPZihcImRlYm91bmNlXCIpO1xuICAgIGtleU1vZGlmaWVycy5zcGxpY2UoZGVib3VuY2VJbmRleCwgaXNOdW1lcmljKChrZXlNb2RpZmllcnNbZGVib3VuY2VJbmRleCArIDFdIHx8IFwiaW52YWxpZC13YWl0XCIpLnNwbGl0KFwibXNcIilbMF0pID8gMiA6IDEpO1xuICB9XG4gIGlmIChrZXlNb2RpZmllcnMuaW5jbHVkZXMoXCJ0aHJvdHRsZVwiKSkge1xuICAgIGxldCBkZWJvdW5jZUluZGV4ID0ga2V5TW9kaWZpZXJzLmluZGV4T2YoXCJ0aHJvdHRsZVwiKTtcbiAgICBrZXlNb2RpZmllcnMuc3BsaWNlKGRlYm91bmNlSW5kZXgsIGlzTnVtZXJpYygoa2V5TW9kaWZpZXJzW2RlYm91bmNlSW5kZXggKyAxXSB8fCBcImludmFsaWQtd2FpdFwiKS5zcGxpdChcIm1zXCIpWzBdKSA/IDIgOiAxKTtcbiAgfVxuICBpZiAoa2V5TW9kaWZpZXJzLmxlbmd0aCA9PT0gMClcbiAgICByZXR1cm4gZmFsc2U7XG4gIGlmIChrZXlNb2RpZmllcnMubGVuZ3RoID09PSAxICYmIGtleVRvTW9kaWZpZXJzKGUua2V5KS5pbmNsdWRlcyhrZXlNb2RpZmllcnNbMF0pKVxuICAgIHJldHVybiBmYWxzZTtcbiAgY29uc3Qgc3lzdGVtS2V5TW9kaWZpZXJzID0gW1wiY3RybFwiLCBcInNoaWZ0XCIsIFwiYWx0XCIsIFwibWV0YVwiLCBcImNtZFwiLCBcInN1cGVyXCJdO1xuICBjb25zdCBzZWxlY3RlZFN5c3RlbUtleU1vZGlmaWVycyA9IHN5c3RlbUtleU1vZGlmaWVycy5maWx0ZXIoKG1vZGlmaWVyKSA9PiBrZXlNb2RpZmllcnMuaW5jbHVkZXMobW9kaWZpZXIpKTtcbiAga2V5TW9kaWZpZXJzID0ga2V5TW9kaWZpZXJzLmZpbHRlcigoaSkgPT4gIXNlbGVjdGVkU3lzdGVtS2V5TW9kaWZpZXJzLmluY2x1ZGVzKGkpKTtcbiAgaWYgKHNlbGVjdGVkU3lzdGVtS2V5TW9kaWZpZXJzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBhY3RpdmVseVByZXNzZWRLZXlNb2RpZmllcnMgPSBzZWxlY3RlZFN5c3RlbUtleU1vZGlmaWVycy5maWx0ZXIoKG1vZGlmaWVyKSA9PiB7XG4gICAgICBpZiAobW9kaWZpZXIgPT09IFwiY21kXCIgfHwgbW9kaWZpZXIgPT09IFwic3VwZXJcIilcbiAgICAgICAgbW9kaWZpZXIgPSBcIm1ldGFcIjtcbiAgICAgIHJldHVybiBlW2Ake21vZGlmaWVyfUtleWBdO1xuICAgIH0pO1xuICAgIGlmIChhY3RpdmVseVByZXNzZWRLZXlNb2RpZmllcnMubGVuZ3RoID09PSBzZWxlY3RlZFN5c3RlbUtleU1vZGlmaWVycy5sZW5ndGgpIHtcbiAgICAgIGlmIChpc0NsaWNrRXZlbnQoZS50eXBlKSlcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKGtleVRvTW9kaWZpZXJzKGUua2V5KS5pbmNsdWRlcyhrZXlNb2RpZmllcnNbMF0pKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuZnVuY3Rpb24ga2V5VG9Nb2RpZmllcnMoa2V5KSB7XG4gIGlmICgha2V5KVxuICAgIHJldHVybiBbXTtcbiAga2V5ID0ga2ViYWJDYXNlMihrZXkpO1xuICBsZXQgbW9kaWZpZXJUb0tleU1hcCA9IHtcbiAgICBcImN0cmxcIjogXCJjb250cm9sXCIsXG4gICAgXCJzbGFzaFwiOiBcIi9cIixcbiAgICBcInNwYWNlXCI6IFwiIFwiLFxuICAgIFwic3BhY2ViYXJcIjogXCIgXCIsXG4gICAgXCJjbWRcIjogXCJtZXRhXCIsXG4gICAgXCJlc2NcIjogXCJlc2NhcGVcIixcbiAgICBcInVwXCI6IFwiYXJyb3ctdXBcIixcbiAgICBcImRvd25cIjogXCJhcnJvdy1kb3duXCIsXG4gICAgXCJsZWZ0XCI6IFwiYXJyb3ctbGVmdFwiLFxuICAgIFwicmlnaHRcIjogXCJhcnJvdy1yaWdodFwiLFxuICAgIFwicGVyaW9kXCI6IFwiLlwiLFxuICAgIFwiY29tbWFcIjogXCIsXCIsXG4gICAgXCJlcXVhbFwiOiBcIj1cIixcbiAgICBcIm1pbnVzXCI6IFwiLVwiLFxuICAgIFwidW5kZXJzY29yZVwiOiBcIl9cIlxuICB9O1xuICBtb2RpZmllclRvS2V5TWFwW2tleV0gPSBrZXk7XG4gIHJldHVybiBPYmplY3Qua2V5cyhtb2RpZmllclRvS2V5TWFwKS5tYXAoKG1vZGlmaWVyKSA9PiB7XG4gICAgaWYgKG1vZGlmaWVyVG9LZXlNYXBbbW9kaWZpZXJdID09PSBrZXkpXG4gICAgICByZXR1cm4gbW9kaWZpZXI7XG4gIH0pLmZpbHRlcigobW9kaWZpZXIpID0+IG1vZGlmaWVyKTtcbn1cblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RpcmVjdGl2ZXMveC1tb2RlbC5qc1xuZGlyZWN0aXZlKFwibW9kZWxcIiwgKGVsLCB7IG1vZGlmaWVycywgZXhwcmVzc2lvbiB9LCB7IGVmZmVjdDogZWZmZWN0MywgY2xlYW51cDogY2xlYW51cDIgfSkgPT4ge1xuICBsZXQgc2NvcGVUYXJnZXQgPSBlbDtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcInBhcmVudFwiKSkge1xuICAgIHNjb3BlVGFyZ2V0ID0gZWwucGFyZW50Tm9kZTtcbiAgfVxuICBsZXQgZXZhbHVhdGVHZXQgPSBldmFsdWF0ZUxhdGVyKHNjb3BlVGFyZ2V0LCBleHByZXNzaW9uKTtcbiAgbGV0IGV2YWx1YXRlU2V0O1xuICBpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIpIHtcbiAgICBldmFsdWF0ZVNldCA9IGV2YWx1YXRlTGF0ZXIoc2NvcGVUYXJnZXQsIGAke2V4cHJlc3Npb259ID0gX19wbGFjZWhvbGRlcmApO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBleHByZXNzaW9uID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIGV4cHJlc3Npb24oKSA9PT0gXCJzdHJpbmdcIikge1xuICAgIGV2YWx1YXRlU2V0ID0gZXZhbHVhdGVMYXRlcihzY29wZVRhcmdldCwgYCR7ZXhwcmVzc2lvbigpfSA9IF9fcGxhY2Vob2xkZXJgKTtcbiAgfSBlbHNlIHtcbiAgICBldmFsdWF0ZVNldCA9ICgpID0+IHtcbiAgICB9O1xuICB9XG4gIGxldCBnZXRWYWx1ZSA9ICgpID0+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGV2YWx1YXRlR2V0KCh2YWx1ZSkgPT4gcmVzdWx0ID0gdmFsdWUpO1xuICAgIHJldHVybiBpc0dldHRlclNldHRlcihyZXN1bHQpID8gcmVzdWx0LmdldCgpIDogcmVzdWx0O1xuICB9O1xuICBsZXQgc2V0VmFsdWUgPSAodmFsdWUpID0+IHtcbiAgICBsZXQgcmVzdWx0O1xuICAgIGV2YWx1YXRlR2V0KCh2YWx1ZTIpID0+IHJlc3VsdCA9IHZhbHVlMik7XG4gICAgaWYgKGlzR2V0dGVyU2V0dGVyKHJlc3VsdCkpIHtcbiAgICAgIHJlc3VsdC5zZXQodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBldmFsdWF0ZVNldCgoKSA9PiB7XG4gICAgICB9LCB7XG4gICAgICAgIHNjb3BlOiB7IFwiX19wbGFjZWhvbGRlclwiOiB2YWx1ZSB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG4gIGlmICh0eXBlb2YgZXhwcmVzc2lvbiA9PT0gXCJzdHJpbmdcIiAmJiBlbC50eXBlID09PSBcInJhZGlvXCIpIHtcbiAgICBtdXRhdGVEb20oKCkgPT4ge1xuICAgICAgaWYgKCFlbC5oYXNBdHRyaWJ1dGUoXCJuYW1lXCIpKVxuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoXCJuYW1lXCIsIGV4cHJlc3Npb24pO1xuICAgIH0pO1xuICB9XG4gIHZhciBldmVudCA9IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJzZWxlY3RcIiB8fCBbXCJjaGVja2JveFwiLCBcInJhZGlvXCJdLmluY2x1ZGVzKGVsLnR5cGUpIHx8IG1vZGlmaWVycy5pbmNsdWRlcyhcImxhenlcIikgPyBcImNoYW5nZVwiIDogXCJpbnB1dFwiO1xuICBsZXQgcmVtb3ZlTGlzdGVuZXIgPSBpc0Nsb25pbmcgPyAoKSA9PiB7XG4gIH0gOiBvbihlbCwgZXZlbnQsIG1vZGlmaWVycywgKGUpID0+IHtcbiAgICBzZXRWYWx1ZShnZXRJbnB1dFZhbHVlKGVsLCBtb2RpZmllcnMsIGUsIGdldFZhbHVlKCkpKTtcbiAgfSk7XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJmaWxsXCIpKSB7XG4gICAgaWYgKFt2b2lkIDAsIG51bGwsIFwiXCJdLmluY2x1ZGVzKGdldFZhbHVlKCkpIHx8IGVsLnR5cGUgPT09IFwiY2hlY2tib3hcIiAmJiBBcnJheS5pc0FycmF5KGdldFZhbHVlKCkpIHx8IGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJzZWxlY3RcIiAmJiBlbC5tdWx0aXBsZSkge1xuICAgICAgc2V0VmFsdWUoXG4gICAgICAgIGdldElucHV0VmFsdWUoZWwsIG1vZGlmaWVycywgeyB0YXJnZXQ6IGVsIH0sIGdldFZhbHVlKCkpXG4gICAgICApO1xuICAgIH1cbiAgfVxuICBpZiAoIWVsLl94X3JlbW92ZU1vZGVsTGlzdGVuZXJzKVxuICAgIGVsLl94X3JlbW92ZU1vZGVsTGlzdGVuZXJzID0ge307XG4gIGVsLl94X3JlbW92ZU1vZGVsTGlzdGVuZXJzW1wiZGVmYXVsdFwiXSA9IHJlbW92ZUxpc3RlbmVyO1xuICBjbGVhbnVwMigoKSA9PiBlbC5feF9yZW1vdmVNb2RlbExpc3RlbmVyc1tcImRlZmF1bHRcIl0oKSk7XG4gIGlmIChlbC5mb3JtKSB7XG4gICAgbGV0IHJlbW92ZVJlc2V0TGlzdGVuZXIgPSBvbihlbC5mb3JtLCBcInJlc2V0XCIsIFtdLCAoZSkgPT4ge1xuICAgICAgbmV4dFRpY2soKCkgPT4gZWwuX3hfbW9kZWwgJiYgZWwuX3hfbW9kZWwuc2V0KGdldElucHV0VmFsdWUoZWwsIG1vZGlmaWVycywgeyB0YXJnZXQ6IGVsIH0sIGdldFZhbHVlKCkpKSk7XG4gICAgfSk7XG4gICAgY2xlYW51cDIoKCkgPT4gcmVtb3ZlUmVzZXRMaXN0ZW5lcigpKTtcbiAgfVxuICBlbC5feF9tb2RlbCA9IHtcbiAgICBnZXQoKSB7XG4gICAgICByZXR1cm4gZ2V0VmFsdWUoKTtcbiAgICB9LFxuICAgIHNldCh2YWx1ZSkge1xuICAgICAgc2V0VmFsdWUodmFsdWUpO1xuICAgIH1cbiAgfTtcbiAgZWwuX3hfZm9yY2VNb2RlbFVwZGF0ZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICh2YWx1ZSA9PT0gdm9pZCAwICYmIHR5cGVvZiBleHByZXNzaW9uID09PSBcInN0cmluZ1wiICYmIGV4cHJlc3Npb24ubWF0Y2goL1xcLi8pKVxuICAgICAgdmFsdWUgPSBcIlwiO1xuICAgIHdpbmRvdy5mcm9tTW9kZWwgPSB0cnVlO1xuICAgIG11dGF0ZURvbSgoKSA9PiBiaW5kKGVsLCBcInZhbHVlXCIsIHZhbHVlKSk7XG4gICAgZGVsZXRlIHdpbmRvdy5mcm9tTW9kZWw7XG4gIH07XG4gIGVmZmVjdDMoKCkgPT4ge1xuICAgIGxldCB2YWx1ZSA9IGdldFZhbHVlKCk7XG4gICAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcInVuaW50cnVzaXZlXCIpICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuaXNTYW1lTm9kZShlbCkpXG4gICAgICByZXR1cm47XG4gICAgZWwuX3hfZm9yY2VNb2RlbFVwZGF0ZSh2YWx1ZSk7XG4gIH0pO1xufSk7XG5mdW5jdGlvbiBnZXRJbnB1dFZhbHVlKGVsLCBtb2RpZmllcnMsIGV2ZW50LCBjdXJyZW50VmFsdWUpIHtcbiAgcmV0dXJuIG11dGF0ZURvbSgoKSA9PiB7XG4gICAgaWYgKGV2ZW50IGluc3RhbmNlb2YgQ3VzdG9tRXZlbnQgJiYgZXZlbnQuZGV0YWlsICE9PSB2b2lkIDApXG4gICAgICByZXR1cm4gZXZlbnQuZGV0YWlsICE9PSBudWxsICYmIGV2ZW50LmRldGFpbCAhPT0gdm9pZCAwID8gZXZlbnQuZGV0YWlsIDogZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgIGVsc2UgaWYgKGVsLnR5cGUgPT09IFwiY2hlY2tib3hcIikge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkoY3VycmVudFZhbHVlKSkge1xuICAgICAgICBsZXQgbmV3VmFsdWUgPSBudWxsO1xuICAgICAgICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwibnVtYmVyXCIpKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBzYWZlUGFyc2VOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJib29sZWFuXCIpKSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBzYWZlUGFyc2VCb29sZWFuKGV2ZW50LnRhcmdldC52YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGV2ZW50LnRhcmdldC5jaGVja2VkID8gY3VycmVudFZhbHVlLmluY2x1ZGVzKG5ld1ZhbHVlKSA/IGN1cnJlbnRWYWx1ZSA6IGN1cnJlbnRWYWx1ZS5jb25jYXQoW25ld1ZhbHVlXSkgOiBjdXJyZW50VmFsdWUuZmlsdGVyKChlbDIpID0+ICFjaGVja2VkQXR0ckxvb3NlQ29tcGFyZTIoZWwyLCBuZXdWYWx1ZSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50LnRhcmdldC5jaGVja2VkO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcInNlbGVjdFwiICYmIGVsLm11bHRpcGxlKSB7XG4gICAgICBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwibnVtYmVyXCIpKSB7XG4gICAgICAgIHJldHVybiBBcnJheS5mcm9tKGV2ZW50LnRhcmdldC5zZWxlY3RlZE9wdGlvbnMpLm1hcCgob3B0aW9uKSA9PiB7XG4gICAgICAgICAgbGV0IHJhd1ZhbHVlID0gb3B0aW9uLnZhbHVlIHx8IG9wdGlvbi50ZXh0O1xuICAgICAgICAgIHJldHVybiBzYWZlUGFyc2VOdW1iZXIocmF3VmFsdWUpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAobW9kaWZpZXJzLmluY2x1ZGVzKFwiYm9vbGVhblwiKSkge1xuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbShldmVudC50YXJnZXQuc2VsZWN0ZWRPcHRpb25zKS5tYXAoKG9wdGlvbikgPT4ge1xuICAgICAgICAgIGxldCByYXdWYWx1ZSA9IG9wdGlvbi52YWx1ZSB8fCBvcHRpb24udGV4dDtcbiAgICAgICAgICByZXR1cm4gc2FmZVBhcnNlQm9vbGVhbihyYXdWYWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIEFycmF5LmZyb20oZXZlbnQudGFyZ2V0LnNlbGVjdGVkT3B0aW9ucykubWFwKChvcHRpb24pID0+IHtcbiAgICAgICAgcmV0dXJuIG9wdGlvbi52YWx1ZSB8fCBvcHRpb24udGV4dDtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgbmV3VmFsdWU7XG4gICAgICBpZiAoZWwudHlwZSA9PT0gXCJyYWRpb1wiKSB7XG4gICAgICAgIGlmIChldmVudC50YXJnZXQuY2hlY2tlZCkge1xuICAgICAgICAgIG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5ld1ZhbHVlID0gY3VycmVudFZhbHVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgIH1cbiAgICAgIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJudW1iZXJcIikpIHtcbiAgICAgICAgcmV0dXJuIHNhZmVQYXJzZU51bWJlcihuZXdWYWx1ZSk7XG4gICAgICB9IGVsc2UgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImJvb2xlYW5cIikpIHtcbiAgICAgICAgcmV0dXJuIHNhZmVQYXJzZUJvb2xlYW4obmV3VmFsdWUpO1xuICAgICAgfSBlbHNlIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJ0cmltXCIpKSB7XG4gICAgICAgIHJldHVybiBuZXdWYWx1ZS50cmltKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3VmFsdWU7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIHNhZmVQYXJzZU51bWJlcihyYXdWYWx1ZSkge1xuICBsZXQgbnVtYmVyID0gcmF3VmFsdWUgPyBwYXJzZUZsb2F0KHJhd1ZhbHVlKSA6IG51bGw7XG4gIHJldHVybiBpc051bWVyaWMyKG51bWJlcikgPyBudW1iZXIgOiByYXdWYWx1ZTtcbn1cbmZ1bmN0aW9uIGNoZWNrZWRBdHRyTG9vc2VDb21wYXJlMih2YWx1ZUEsIHZhbHVlQikge1xuICByZXR1cm4gdmFsdWVBID09IHZhbHVlQjtcbn1cbmZ1bmN0aW9uIGlzTnVtZXJpYzIoc3ViamVjdCkge1xuICByZXR1cm4gIUFycmF5LmlzQXJyYXkoc3ViamVjdCkgJiYgIWlzTmFOKHN1YmplY3QpO1xufVxuZnVuY3Rpb24gaXNHZXR0ZXJTZXR0ZXIodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdmFsdWUuZ2V0ID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHZhbHVlLnNldCA9PT0gXCJmdW5jdGlvblwiO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LWNsb2FrLmpzXG5kaXJlY3RpdmUoXCJjbG9ha1wiLCAoZWwpID0+IHF1ZXVlTWljcm90YXNrKCgpID0+IG11dGF0ZURvbSgoKSA9PiBlbC5yZW1vdmVBdHRyaWJ1dGUocHJlZml4KFwiY2xvYWtcIikpKSkpO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LWluaXQuanNcbmFkZEluaXRTZWxlY3RvcigoKSA9PiBgWyR7cHJlZml4KFwiaW5pdFwiKX1dYCk7XG5kaXJlY3RpdmUoXCJpbml0XCIsIHNraXBEdXJpbmdDbG9uZSgoZWwsIHsgZXhwcmVzc2lvbiB9LCB7IGV2YWx1YXRlOiBldmFsdWF0ZTIgfSkgPT4ge1xuICBpZiAodHlwZW9mIGV4cHJlc3Npb24gPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gISFleHByZXNzaW9uLnRyaW0oKSAmJiBldmFsdWF0ZTIoZXhwcmVzc2lvbiwge30sIGZhbHNlKTtcbiAgfVxuICByZXR1cm4gZXZhbHVhdGUyKGV4cHJlc3Npb24sIHt9LCBmYWxzZSk7XG59KSk7XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9kaXJlY3RpdmVzL3gtdGV4dC5qc1xuZGlyZWN0aXZlKFwidGV4dFwiLCAoZWwsIHsgZXhwcmVzc2lvbiB9LCB7IGVmZmVjdDogZWZmZWN0MywgZXZhbHVhdGVMYXRlcjogZXZhbHVhdGVMYXRlcjIgfSkgPT4ge1xuICBsZXQgZXZhbHVhdGUyID0gZXZhbHVhdGVMYXRlcjIoZXhwcmVzc2lvbik7XG4gIGVmZmVjdDMoKCkgPT4ge1xuICAgIGV2YWx1YXRlMigodmFsdWUpID0+IHtcbiAgICAgIG11dGF0ZURvbSgoKSA9PiB7XG4gICAgICAgIGVsLnRleHRDb250ZW50ID0gdmFsdWU7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59KTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RpcmVjdGl2ZXMveC1odG1sLmpzXG5kaXJlY3RpdmUoXCJodG1sXCIsIChlbCwgeyBleHByZXNzaW9uIH0sIHsgZWZmZWN0OiBlZmZlY3QzLCBldmFsdWF0ZUxhdGVyOiBldmFsdWF0ZUxhdGVyMiB9KSA9PiB7XG4gIGxldCBldmFsdWF0ZTIgPSBldmFsdWF0ZUxhdGVyMihleHByZXNzaW9uKTtcbiAgZWZmZWN0MygoKSA9PiB7XG4gICAgZXZhbHVhdGUyKCh2YWx1ZSkgPT4ge1xuICAgICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgICAgZWwuaW5uZXJIVE1MID0gdmFsdWU7XG4gICAgICAgIGVsLl94X2lnbm9yZVNlbGYgPSB0cnVlO1xuICAgICAgICBpbml0VHJlZShlbCk7XG4gICAgICAgIGRlbGV0ZSBlbC5feF9pZ25vcmVTZWxmO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vIHBhY2thZ2VzL2FscGluZWpzL3NyYy9kaXJlY3RpdmVzL3gtYmluZC5qc1xubWFwQXR0cmlidXRlcyhzdGFydGluZ1dpdGgoXCI6XCIsIGludG8ocHJlZml4KFwiYmluZDpcIikpKSk7XG52YXIgaGFuZGxlcjIgPSAoZWwsIHsgdmFsdWUsIG1vZGlmaWVycywgZXhwcmVzc2lvbiwgb3JpZ2luYWwgfSwgeyBlZmZlY3Q6IGVmZmVjdDMsIGNsZWFudXA6IGNsZWFudXAyIH0pID0+IHtcbiAgaWYgKCF2YWx1ZSkge1xuICAgIGxldCBiaW5kaW5nUHJvdmlkZXJzID0ge307XG4gICAgaW5qZWN0QmluZGluZ1Byb3ZpZGVycyhiaW5kaW5nUHJvdmlkZXJzKTtcbiAgICBsZXQgZ2V0QmluZGluZ3MgPSBldmFsdWF0ZUxhdGVyKGVsLCBleHByZXNzaW9uKTtcbiAgICBnZXRCaW5kaW5ncygoYmluZGluZ3MpID0+IHtcbiAgICAgIGFwcGx5QmluZGluZ3NPYmplY3QoZWwsIGJpbmRpbmdzLCBvcmlnaW5hbCk7XG4gICAgfSwgeyBzY29wZTogYmluZGluZ1Byb3ZpZGVycyB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHZhbHVlID09PSBcImtleVwiKVxuICAgIHJldHVybiBzdG9yZUtleUZvclhGb3IoZWwsIGV4cHJlc3Npb24pO1xuICBpZiAoZWwuX3hfaW5saW5lQmluZGluZ3MgJiYgZWwuX3hfaW5saW5lQmluZGluZ3NbdmFsdWVdICYmIGVsLl94X2lubGluZUJpbmRpbmdzW3ZhbHVlXS5leHRyYWN0KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBldmFsdWF0ZTIgPSBldmFsdWF0ZUxhdGVyKGVsLCBleHByZXNzaW9uKTtcbiAgZWZmZWN0MygoKSA9PiBldmFsdWF0ZTIoKHJlc3VsdCkgPT4ge1xuICAgIGlmIChyZXN1bHQgPT09IHZvaWQgMCAmJiB0eXBlb2YgZXhwcmVzc2lvbiA9PT0gXCJzdHJpbmdcIiAmJiBleHByZXNzaW9uLm1hdGNoKC9cXC4vKSkge1xuICAgICAgcmVzdWx0ID0gXCJcIjtcbiAgICB9XG4gICAgbXV0YXRlRG9tKCgpID0+IGJpbmQoZWwsIHZhbHVlLCByZXN1bHQsIG1vZGlmaWVycykpO1xuICB9KSk7XG4gIGNsZWFudXAyKCgpID0+IHtcbiAgICBlbC5feF91bmRvQWRkZWRDbGFzc2VzICYmIGVsLl94X3VuZG9BZGRlZENsYXNzZXMoKTtcbiAgICBlbC5feF91bmRvQWRkZWRTdHlsZXMgJiYgZWwuX3hfdW5kb0FkZGVkU3R5bGVzKCk7XG4gIH0pO1xufTtcbmhhbmRsZXIyLmlubGluZSA9IChlbCwgeyB2YWx1ZSwgbW9kaWZpZXJzLCBleHByZXNzaW9uIH0pID0+IHtcbiAgaWYgKCF2YWx1ZSlcbiAgICByZXR1cm47XG4gIGlmICghZWwuX3hfaW5saW5lQmluZGluZ3MpXG4gICAgZWwuX3hfaW5saW5lQmluZGluZ3MgPSB7fTtcbiAgZWwuX3hfaW5saW5lQmluZGluZ3NbdmFsdWVdID0geyBleHByZXNzaW9uLCBleHRyYWN0OiBmYWxzZSB9O1xufTtcbmRpcmVjdGl2ZShcImJpbmRcIiwgaGFuZGxlcjIpO1xuZnVuY3Rpb24gc3RvcmVLZXlGb3JYRm9yKGVsLCBleHByZXNzaW9uKSB7XG4gIGVsLl94X2tleUV4cHJlc3Npb24gPSBleHByZXNzaW9uO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LWRhdGEuanNcbmFkZFJvb3RTZWxlY3RvcigoKSA9PiBgWyR7cHJlZml4KFwiZGF0YVwiKX1dYCk7XG5kaXJlY3RpdmUoXCJkYXRhXCIsIChlbCwgeyBleHByZXNzaW9uIH0sIHsgY2xlYW51cDogY2xlYW51cDIgfSkgPT4ge1xuICBpZiAoc2hvdWxkU2tpcFJlZ2lzdGVyaW5nRGF0YUR1cmluZ0Nsb25lKGVsKSlcbiAgICByZXR1cm47XG4gIGV4cHJlc3Npb24gPSBleHByZXNzaW9uID09PSBcIlwiID8gXCJ7fVwiIDogZXhwcmVzc2lvbjtcbiAgbGV0IG1hZ2ljQ29udGV4dCA9IHt9O1xuICBpbmplY3RNYWdpY3MobWFnaWNDb250ZXh0LCBlbCk7XG4gIGxldCBkYXRhUHJvdmlkZXJDb250ZXh0ID0ge307XG4gIGluamVjdERhdGFQcm92aWRlcnMoZGF0YVByb3ZpZGVyQ29udGV4dCwgbWFnaWNDb250ZXh0KTtcbiAgbGV0IGRhdGEyID0gZXZhbHVhdGUoZWwsIGV4cHJlc3Npb24sIHsgc2NvcGU6IGRhdGFQcm92aWRlckNvbnRleHQgfSk7XG4gIGlmIChkYXRhMiA9PT0gdm9pZCAwIHx8IGRhdGEyID09PSB0cnVlKVxuICAgIGRhdGEyID0ge307XG4gIGluamVjdE1hZ2ljcyhkYXRhMiwgZWwpO1xuICBsZXQgcmVhY3RpdmVEYXRhID0gcmVhY3RpdmUoZGF0YTIpO1xuICBpbml0SW50ZXJjZXB0b3JzKHJlYWN0aXZlRGF0YSk7XG4gIGxldCB1bmRvID0gYWRkU2NvcGVUb05vZGUoZWwsIHJlYWN0aXZlRGF0YSk7XG4gIHJlYWN0aXZlRGF0YVtcImluaXRcIl0gJiYgZXZhbHVhdGUoZWwsIHJlYWN0aXZlRGF0YVtcImluaXRcIl0pO1xuICBjbGVhbnVwMigoKSA9PiB7XG4gICAgcmVhY3RpdmVEYXRhW1wiZGVzdHJveVwiXSAmJiBldmFsdWF0ZShlbCwgcmVhY3RpdmVEYXRhW1wiZGVzdHJveVwiXSk7XG4gICAgdW5kbygpO1xuICB9KTtcbn0pO1xuaW50ZXJjZXB0Q2xvbmUoKGZyb20sIHRvKSA9PiB7XG4gIGlmIChmcm9tLl94X2RhdGFTdGFjaykge1xuICAgIHRvLl94X2RhdGFTdGFjayA9IGZyb20uX3hfZGF0YVN0YWNrO1xuICAgIHRvLnNldEF0dHJpYnV0ZShcImRhdGEtaGFzLWFscGluZS1zdGF0ZVwiLCB0cnVlKTtcbiAgfVxufSk7XG5mdW5jdGlvbiBzaG91bGRTa2lwUmVnaXN0ZXJpbmdEYXRhRHVyaW5nQ2xvbmUoZWwpIHtcbiAgaWYgKCFpc0Nsb25pbmcpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBpZiAoaXNDbG9uaW5nTGVnYWN5KVxuICAgIHJldHVybiB0cnVlO1xuICByZXR1cm4gZWwuaGFzQXR0cmlidXRlKFwiZGF0YS1oYXMtYWxwaW5lLXN0YXRlXCIpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LXNob3cuanNcbmRpcmVjdGl2ZShcInNob3dcIiwgKGVsLCB7IG1vZGlmaWVycywgZXhwcmVzc2lvbiB9LCB7IGVmZmVjdDogZWZmZWN0MyB9KSA9PiB7XG4gIGxldCBldmFsdWF0ZTIgPSBldmFsdWF0ZUxhdGVyKGVsLCBleHByZXNzaW9uKTtcbiAgaWYgKCFlbC5feF9kb0hpZGUpXG4gICAgZWwuX3hfZG9IaWRlID0gKCkgPT4ge1xuICAgICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoXCJkaXNwbGF5XCIsIFwibm9uZVwiLCBtb2RpZmllcnMuaW5jbHVkZXMoXCJpbXBvcnRhbnRcIikgPyBcImltcG9ydGFudFwiIDogdm9pZCAwKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIGlmICghZWwuX3hfZG9TaG93KVxuICAgIGVsLl94X2RvU2hvdyA9ICgpID0+IHtcbiAgICAgIG11dGF0ZURvbSgoKSA9PiB7XG4gICAgICAgIGlmIChlbC5zdHlsZS5sZW5ndGggPT09IDEgJiYgZWwuc3R5bGUuZGlzcGxheSA9PT0gXCJub25lXCIpIHtcbiAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoXCJzdHlsZVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcImRpc3BsYXlcIik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG4gIGxldCBoaWRlID0gKCkgPT4ge1xuICAgIGVsLl94X2RvSGlkZSgpO1xuICAgIGVsLl94X2lzU2hvd24gPSBmYWxzZTtcbiAgfTtcbiAgbGV0IHNob3cgPSAoKSA9PiB7XG4gICAgZWwuX3hfZG9TaG93KCk7XG4gICAgZWwuX3hfaXNTaG93biA9IHRydWU7XG4gIH07XG4gIGxldCBjbGlja0F3YXlDb21wYXRpYmxlU2hvdyA9ICgpID0+IHNldFRpbWVvdXQoc2hvdyk7XG4gIGxldCB0b2dnbGUgPSBvbmNlKFxuICAgICh2YWx1ZSkgPT4gdmFsdWUgPyBzaG93KCkgOiBoaWRlKCksXG4gICAgKHZhbHVlKSA9PiB7XG4gICAgICBpZiAodHlwZW9mIGVsLl94X3RvZ2dsZUFuZENhc2NhZGVXaXRoVHJhbnNpdGlvbnMgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBlbC5feF90b2dnbGVBbmRDYXNjYWRlV2l0aFRyYW5zaXRpb25zKGVsLCB2YWx1ZSwgc2hvdywgaGlkZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA/IGNsaWNrQXdheUNvbXBhdGlibGVTaG93KCkgOiBoaWRlKCk7XG4gICAgICB9XG4gICAgfVxuICApO1xuICBsZXQgb2xkVmFsdWU7XG4gIGxldCBmaXJzdFRpbWUgPSB0cnVlO1xuICBlZmZlY3QzKCgpID0+IGV2YWx1YXRlMigodmFsdWUpID0+IHtcbiAgICBpZiAoIWZpcnN0VGltZSAmJiB2YWx1ZSA9PT0gb2xkVmFsdWUpXG4gICAgICByZXR1cm47XG4gICAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImltbWVkaWF0ZVwiKSlcbiAgICAgIHZhbHVlID8gY2xpY2tBd2F5Q29tcGF0aWJsZVNob3coKSA6IGhpZGUoKTtcbiAgICB0b2dnbGUodmFsdWUpO1xuICAgIG9sZFZhbHVlID0gdmFsdWU7XG4gICAgZmlyc3RUaW1lID0gZmFsc2U7XG4gIH0pKTtcbn0pO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LWZvci5qc1xuZGlyZWN0aXZlKFwiZm9yXCIsIChlbCwgeyBleHByZXNzaW9uIH0sIHsgZWZmZWN0OiBlZmZlY3QzLCBjbGVhbnVwOiBjbGVhbnVwMiB9KSA9PiB7XG4gIGxldCBpdGVyYXRvck5hbWVzID0gcGFyc2VGb3JFeHByZXNzaW9uKGV4cHJlc3Npb24pO1xuICBsZXQgZXZhbHVhdGVJdGVtcyA9IGV2YWx1YXRlTGF0ZXIoZWwsIGl0ZXJhdG9yTmFtZXMuaXRlbXMpO1xuICBsZXQgZXZhbHVhdGVLZXkgPSBldmFsdWF0ZUxhdGVyKFxuICAgIGVsLFxuICAgIC8vIHRoZSB4LWJpbmQ6a2V5IGV4cHJlc3Npb24gaXMgc3RvcmVkIGZvciBvdXIgdXNlIGluc3RlYWQgb2YgZXZhbHVhdGVkLlxuICAgIGVsLl94X2tleUV4cHJlc3Npb24gfHwgXCJpbmRleFwiXG4gICk7XG4gIGVsLl94X3ByZXZLZXlzID0gW107XG4gIGVsLl94X2xvb2t1cCA9IHt9O1xuICBlZmZlY3QzKCgpID0+IGxvb3AoZWwsIGl0ZXJhdG9yTmFtZXMsIGV2YWx1YXRlSXRlbXMsIGV2YWx1YXRlS2V5KSk7XG4gIGNsZWFudXAyKCgpID0+IHtcbiAgICBPYmplY3QudmFsdWVzKGVsLl94X2xvb2t1cCkuZm9yRWFjaCgoZWwyKSA9PiBlbDIucmVtb3ZlKCkpO1xuICAgIGRlbGV0ZSBlbC5feF9wcmV2S2V5cztcbiAgICBkZWxldGUgZWwuX3hfbG9va3VwO1xuICB9KTtcbn0pO1xuZnVuY3Rpb24gbG9vcChlbCwgaXRlcmF0b3JOYW1lcywgZXZhbHVhdGVJdGVtcywgZXZhbHVhdGVLZXkpIHtcbiAgbGV0IGlzT2JqZWN0MiA9IChpKSA9PiB0eXBlb2YgaSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShpKTtcbiAgbGV0IHRlbXBsYXRlRWwgPSBlbDtcbiAgZXZhbHVhdGVJdGVtcygoaXRlbXMpID0+IHtcbiAgICBpZiAoaXNOdW1lcmljMyhpdGVtcykgJiYgaXRlbXMgPj0gMCkge1xuICAgICAgaXRlbXMgPSBBcnJheS5mcm9tKEFycmF5KGl0ZW1zKS5rZXlzKCksIChpKSA9PiBpICsgMSk7XG4gICAgfVxuICAgIGlmIChpdGVtcyA9PT0gdm9pZCAwKVxuICAgICAgaXRlbXMgPSBbXTtcbiAgICBsZXQgbG9va3VwID0gZWwuX3hfbG9va3VwO1xuICAgIGxldCBwcmV2S2V5cyA9IGVsLl94X3ByZXZLZXlzO1xuICAgIGxldCBzY29wZXMgPSBbXTtcbiAgICBsZXQga2V5cyA9IFtdO1xuICAgIGlmIChpc09iamVjdDIoaXRlbXMpKSB7XG4gICAgICBpdGVtcyA9IE9iamVjdC5lbnRyaWVzKGl0ZW1zKS5tYXAoKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICBsZXQgc2NvcGUyID0gZ2V0SXRlcmF0aW9uU2NvcGVWYXJpYWJsZXMoaXRlcmF0b3JOYW1lcywgdmFsdWUsIGtleSwgaXRlbXMpO1xuICAgICAgICBldmFsdWF0ZUtleSgodmFsdWUyKSA9PiB7XG4gICAgICAgICAgaWYgKGtleXMuaW5jbHVkZXModmFsdWUyKSlcbiAgICAgICAgICAgIHdhcm4oXCJEdXBsaWNhdGUga2V5IG9uIHgtZm9yXCIsIGVsKTtcbiAgICAgICAgICBrZXlzLnB1c2godmFsdWUyKTtcbiAgICAgICAgfSwgeyBzY29wZTogeyBpbmRleDoga2V5LCAuLi5zY29wZTIgfSB9KTtcbiAgICAgICAgc2NvcGVzLnB1c2goc2NvcGUyKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBzY29wZTIgPSBnZXRJdGVyYXRpb25TY29wZVZhcmlhYmxlcyhpdGVyYXRvck5hbWVzLCBpdGVtc1tpXSwgaSwgaXRlbXMpO1xuICAgICAgICBldmFsdWF0ZUtleSgodmFsdWUpID0+IHtcbiAgICAgICAgICBpZiAoa2V5cy5pbmNsdWRlcyh2YWx1ZSkpXG4gICAgICAgICAgICB3YXJuKFwiRHVwbGljYXRlIGtleSBvbiB4LWZvclwiLCBlbCk7XG4gICAgICAgICAga2V5cy5wdXNoKHZhbHVlKTtcbiAgICAgICAgfSwgeyBzY29wZTogeyBpbmRleDogaSwgLi4uc2NvcGUyIH0gfSk7XG4gICAgICAgIHNjb3Blcy5wdXNoKHNjb3BlMik7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBhZGRzID0gW107XG4gICAgbGV0IG1vdmVzID0gW107XG4gICAgbGV0IHJlbW92ZXMgPSBbXTtcbiAgICBsZXQgc2FtZXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByZXZLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQga2V5ID0gcHJldktleXNbaV07XG4gICAgICBpZiAoa2V5cy5pbmRleE9mKGtleSkgPT09IC0xKVxuICAgICAgICByZW1vdmVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcHJldktleXMgPSBwcmV2S2V5cy5maWx0ZXIoKGtleSkgPT4gIXJlbW92ZXMuaW5jbHVkZXMoa2V5KSk7XG4gICAgbGV0IGxhc3RLZXkgPSBcInRlbXBsYXRlXCI7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQga2V5ID0ga2V5c1tpXTtcbiAgICAgIGxldCBwcmV2SW5kZXggPSBwcmV2S2V5cy5pbmRleE9mKGtleSk7XG4gICAgICBpZiAocHJldkluZGV4ID09PSAtMSkge1xuICAgICAgICBwcmV2S2V5cy5zcGxpY2UoaSwgMCwga2V5KTtcbiAgICAgICAgYWRkcy5wdXNoKFtsYXN0S2V5LCBpXSk7XG4gICAgICB9IGVsc2UgaWYgKHByZXZJbmRleCAhPT0gaSkge1xuICAgICAgICBsZXQga2V5SW5TcG90ID0gcHJldktleXMuc3BsaWNlKGksIDEpWzBdO1xuICAgICAgICBsZXQga2V5Rm9yU3BvdCA9IHByZXZLZXlzLnNwbGljZShwcmV2SW5kZXggLSAxLCAxKVswXTtcbiAgICAgICAgcHJldktleXMuc3BsaWNlKGksIDAsIGtleUZvclNwb3QpO1xuICAgICAgICBwcmV2S2V5cy5zcGxpY2UocHJldkluZGV4LCAwLCBrZXlJblNwb3QpO1xuICAgICAgICBtb3Zlcy5wdXNoKFtrZXlJblNwb3QsIGtleUZvclNwb3RdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNhbWVzLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICAgIGxhc3RLZXkgPSBrZXk7XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmVtb3Zlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbGV0IGtleSA9IHJlbW92ZXNbaV07XG4gICAgICBpZiAoISFsb29rdXBba2V5XS5feF9lZmZlY3RzKSB7XG4gICAgICAgIGxvb2t1cFtrZXldLl94X2VmZmVjdHMuZm9yRWFjaChkZXF1ZXVlSm9iKTtcbiAgICAgIH1cbiAgICAgIGxvb2t1cFtrZXldLnJlbW92ZSgpO1xuICAgICAgbG9va3VwW2tleV0gPSBudWxsO1xuICAgICAgZGVsZXRlIGxvb2t1cFtrZXldO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG1vdmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgW2tleUluU3BvdCwga2V5Rm9yU3BvdF0gPSBtb3Zlc1tpXTtcbiAgICAgIGxldCBlbEluU3BvdCA9IGxvb2t1cFtrZXlJblNwb3RdO1xuICAgICAgbGV0IGVsRm9yU3BvdCA9IGxvb2t1cFtrZXlGb3JTcG90XTtcbiAgICAgIGxldCBtYXJrZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgICAgaWYgKCFlbEZvclNwb3QpXG4gICAgICAgICAgd2FybihgeC1mb3IgXCI6a2V5XCIgaXMgdW5kZWZpbmVkIG9yIGludmFsaWRgLCB0ZW1wbGF0ZUVsLCBrZXlGb3JTcG90LCBsb29rdXApO1xuICAgICAgICBlbEZvclNwb3QuYWZ0ZXIobWFya2VyKTtcbiAgICAgICAgZWxJblNwb3QuYWZ0ZXIoZWxGb3JTcG90KTtcbiAgICAgICAgZWxGb3JTcG90Ll94X2N1cnJlbnRJZkVsICYmIGVsRm9yU3BvdC5hZnRlcihlbEZvclNwb3QuX3hfY3VycmVudElmRWwpO1xuICAgICAgICBtYXJrZXIuYmVmb3JlKGVsSW5TcG90KTtcbiAgICAgICAgZWxJblNwb3QuX3hfY3VycmVudElmRWwgJiYgZWxJblNwb3QuYWZ0ZXIoZWxJblNwb3QuX3hfY3VycmVudElmRWwpO1xuICAgICAgICBtYXJrZXIucmVtb3ZlKCk7XG4gICAgICB9KTtcbiAgICAgIGVsRm9yU3BvdC5feF9yZWZyZXNoWEZvclNjb3BlKHNjb3Blc1trZXlzLmluZGV4T2Yoa2V5Rm9yU3BvdCldKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhZGRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsZXQgW2xhc3RLZXkyLCBpbmRleF0gPSBhZGRzW2ldO1xuICAgICAgbGV0IGxhc3RFbCA9IGxhc3RLZXkyID09PSBcInRlbXBsYXRlXCIgPyB0ZW1wbGF0ZUVsIDogbG9va3VwW2xhc3RLZXkyXTtcbiAgICAgIGlmIChsYXN0RWwuX3hfY3VycmVudElmRWwpXG4gICAgICAgIGxhc3RFbCA9IGxhc3RFbC5feF9jdXJyZW50SWZFbDtcbiAgICAgIGxldCBzY29wZTIgPSBzY29wZXNbaW5kZXhdO1xuICAgICAgbGV0IGtleSA9IGtleXNbaW5kZXhdO1xuICAgICAgbGV0IGNsb25lMiA9IGRvY3VtZW50LmltcG9ydE5vZGUodGVtcGxhdGVFbC5jb250ZW50LCB0cnVlKS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgIGxldCByZWFjdGl2ZVNjb3BlID0gcmVhY3RpdmUoc2NvcGUyKTtcbiAgICAgIGFkZFNjb3BlVG9Ob2RlKGNsb25lMiwgcmVhY3RpdmVTY29wZSwgdGVtcGxhdGVFbCk7XG4gICAgICBjbG9uZTIuX3hfcmVmcmVzaFhGb3JTY29wZSA9IChuZXdTY29wZSkgPT4ge1xuICAgICAgICBPYmplY3QuZW50cmllcyhuZXdTY29wZSkuZm9yRWFjaCgoW2tleTIsIHZhbHVlXSkgPT4ge1xuICAgICAgICAgIHJlYWN0aXZlU2NvcGVba2V5Ml0gPSB2YWx1ZTtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgICAgbGFzdEVsLmFmdGVyKGNsb25lMik7XG4gICAgICAgIHNraXBEdXJpbmdDbG9uZSgoKSA9PiBpbml0VHJlZShjbG9uZTIpKSgpO1xuICAgICAgfSk7XG4gICAgICBpZiAodHlwZW9mIGtleSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICB3YXJuKFwieC1mb3Iga2V5IGNhbm5vdCBiZSBhbiBvYmplY3QsIGl0IG11c3QgYmUgYSBzdHJpbmcgb3IgYW4gaW50ZWdlclwiLCB0ZW1wbGF0ZUVsKTtcbiAgICAgIH1cbiAgICAgIGxvb2t1cFtrZXldID0gY2xvbmUyO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNhbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsb29rdXBbc2FtZXNbaV1dLl94X3JlZnJlc2hYRm9yU2NvcGUoc2NvcGVzW2tleXMuaW5kZXhPZihzYW1lc1tpXSldKTtcbiAgICB9XG4gICAgdGVtcGxhdGVFbC5feF9wcmV2S2V5cyA9IGtleXM7XG4gIH0pO1xufVxuZnVuY3Rpb24gcGFyc2VGb3JFeHByZXNzaW9uKGV4cHJlc3Npb24pIHtcbiAgbGV0IGZvckl0ZXJhdG9yUkUgPSAvLChbXixcXH1cXF1dKikoPzosKFteLFxcfVxcXV0qKSk/JC87XG4gIGxldCBzdHJpcFBhcmVuc1JFID0gL15cXHMqXFwofFxcKVxccyokL2c7XG4gIGxldCBmb3JBbGlhc1JFID0gLyhbXFxzXFxTXSo/KVxccysoPzppbnxvZilcXHMrKFtcXHNcXFNdKikvO1xuICBsZXQgaW5NYXRjaCA9IGV4cHJlc3Npb24ubWF0Y2goZm9yQWxpYXNSRSk7XG4gIGlmICghaW5NYXRjaClcbiAgICByZXR1cm47XG4gIGxldCByZXMgPSB7fTtcbiAgcmVzLml0ZW1zID0gaW5NYXRjaFsyXS50cmltKCk7XG4gIGxldCBpdGVtID0gaW5NYXRjaFsxXS5yZXBsYWNlKHN0cmlwUGFyZW5zUkUsIFwiXCIpLnRyaW0oKTtcbiAgbGV0IGl0ZXJhdG9yTWF0Y2ggPSBpdGVtLm1hdGNoKGZvckl0ZXJhdG9yUkUpO1xuICBpZiAoaXRlcmF0b3JNYXRjaCkge1xuICAgIHJlcy5pdGVtID0gaXRlbS5yZXBsYWNlKGZvckl0ZXJhdG9yUkUsIFwiXCIpLnRyaW0oKTtcbiAgICByZXMuaW5kZXggPSBpdGVyYXRvck1hdGNoWzFdLnRyaW0oKTtcbiAgICBpZiAoaXRlcmF0b3JNYXRjaFsyXSkge1xuICAgICAgcmVzLmNvbGxlY3Rpb24gPSBpdGVyYXRvck1hdGNoWzJdLnRyaW0oKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmVzLml0ZW0gPSBpdGVtO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5mdW5jdGlvbiBnZXRJdGVyYXRpb25TY29wZVZhcmlhYmxlcyhpdGVyYXRvck5hbWVzLCBpdGVtLCBpbmRleCwgaXRlbXMpIHtcbiAgbGV0IHNjb3BlVmFyaWFibGVzID0ge307XG4gIGlmICgvXlxcWy4qXFxdJC8udGVzdChpdGVyYXRvck5hbWVzLml0ZW0pICYmIEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICBsZXQgbmFtZXMgPSBpdGVyYXRvck5hbWVzLml0ZW0ucmVwbGFjZShcIltcIiwgXCJcIikucmVwbGFjZShcIl1cIiwgXCJcIikuc3BsaXQoXCIsXCIpLm1hcCgoaSkgPT4gaS50cmltKCkpO1xuICAgIG5hbWVzLmZvckVhY2goKG5hbWUsIGkpID0+IHtcbiAgICAgIHNjb3BlVmFyaWFibGVzW25hbWVdID0gaXRlbVtpXTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICgvXlxcey4qXFx9JC8udGVzdChpdGVyYXRvck5hbWVzLml0ZW0pICYmICFBcnJheS5pc0FycmF5KGl0ZW0pICYmIHR5cGVvZiBpdGVtID09PSBcIm9iamVjdFwiKSB7XG4gICAgbGV0IG5hbWVzID0gaXRlcmF0b3JOYW1lcy5pdGVtLnJlcGxhY2UoXCJ7XCIsIFwiXCIpLnJlcGxhY2UoXCJ9XCIsIFwiXCIpLnNwbGl0KFwiLFwiKS5tYXAoKGkpID0+IGkudHJpbSgpKTtcbiAgICBuYW1lcy5mb3JFYWNoKChuYW1lKSA9PiB7XG4gICAgICBzY29wZVZhcmlhYmxlc1tuYW1lXSA9IGl0ZW1bbmFtZV07XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgc2NvcGVWYXJpYWJsZXNbaXRlcmF0b3JOYW1lcy5pdGVtXSA9IGl0ZW07XG4gIH1cbiAgaWYgKGl0ZXJhdG9yTmFtZXMuaW5kZXgpXG4gICAgc2NvcGVWYXJpYWJsZXNbaXRlcmF0b3JOYW1lcy5pbmRleF0gPSBpbmRleDtcbiAgaWYgKGl0ZXJhdG9yTmFtZXMuY29sbGVjdGlvbilcbiAgICBzY29wZVZhcmlhYmxlc1tpdGVyYXRvck5hbWVzLmNvbGxlY3Rpb25dID0gaXRlbXM7XG4gIHJldHVybiBzY29wZVZhcmlhYmxlcztcbn1cbmZ1bmN0aW9uIGlzTnVtZXJpYzMoc3ViamVjdCkge1xuICByZXR1cm4gIUFycmF5LmlzQXJyYXkoc3ViamVjdCkgJiYgIWlzTmFOKHN1YmplY3QpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LXJlZi5qc1xuZnVuY3Rpb24gaGFuZGxlcjMoKSB7XG59XG5oYW5kbGVyMy5pbmxpbmUgPSAoZWwsIHsgZXhwcmVzc2lvbiB9LCB7IGNsZWFudXA6IGNsZWFudXAyIH0pID0+IHtcbiAgbGV0IHJvb3QgPSBjbG9zZXN0Um9vdChlbCk7XG4gIGlmICghcm9vdC5feF9yZWZzKVxuICAgIHJvb3QuX3hfcmVmcyA9IHt9O1xuICByb290Ll94X3JlZnNbZXhwcmVzc2lvbl0gPSBlbDtcbiAgY2xlYW51cDIoKCkgPT4gZGVsZXRlIHJvb3QuX3hfcmVmc1tleHByZXNzaW9uXSk7XG59O1xuZGlyZWN0aXZlKFwicmVmXCIsIGhhbmRsZXIzKTtcblxuLy8gcGFja2FnZXMvYWxwaW5lanMvc3JjL2RpcmVjdGl2ZXMveC1pZi5qc1xuZGlyZWN0aXZlKFwiaWZcIiwgKGVsLCB7IGV4cHJlc3Npb24gfSwgeyBlZmZlY3Q6IGVmZmVjdDMsIGNsZWFudXA6IGNsZWFudXAyIH0pID0+IHtcbiAgaWYgKGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPT0gXCJ0ZW1wbGF0ZVwiKVxuICAgIHdhcm4oXCJ4LWlmIGNhbiBvbmx5IGJlIHVzZWQgb24gYSA8dGVtcGxhdGU+IHRhZ1wiLCBlbCk7XG4gIGxldCBldmFsdWF0ZTIgPSBldmFsdWF0ZUxhdGVyKGVsLCBleHByZXNzaW9uKTtcbiAgbGV0IHNob3cgPSAoKSA9PiB7XG4gICAgaWYgKGVsLl94X2N1cnJlbnRJZkVsKVxuICAgICAgcmV0dXJuIGVsLl94X2N1cnJlbnRJZkVsO1xuICAgIGxldCBjbG9uZTIgPSBlbC5jb250ZW50LmNsb25lTm9kZSh0cnVlKS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICBhZGRTY29wZVRvTm9kZShjbG9uZTIsIHt9LCBlbCk7XG4gICAgbXV0YXRlRG9tKCgpID0+IHtcbiAgICAgIGVsLmFmdGVyKGNsb25lMik7XG4gICAgICBza2lwRHVyaW5nQ2xvbmUoKCkgPT4gaW5pdFRyZWUoY2xvbmUyKSkoKTtcbiAgICB9KTtcbiAgICBlbC5feF9jdXJyZW50SWZFbCA9IGNsb25lMjtcbiAgICBlbC5feF91bmRvSWYgPSAoKSA9PiB7XG4gICAgICB3YWxrKGNsb25lMiwgKG5vZGUpID0+IHtcbiAgICAgICAgaWYgKCEhbm9kZS5feF9lZmZlY3RzKSB7XG4gICAgICAgICAgbm9kZS5feF9lZmZlY3RzLmZvckVhY2goZGVxdWV1ZUpvYik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY2xvbmUyLnJlbW92ZSgpO1xuICAgICAgZGVsZXRlIGVsLl94X2N1cnJlbnRJZkVsO1xuICAgIH07XG4gICAgcmV0dXJuIGNsb25lMjtcbiAgfTtcbiAgbGV0IGhpZGUgPSAoKSA9PiB7XG4gICAgaWYgKCFlbC5feF91bmRvSWYpXG4gICAgICByZXR1cm47XG4gICAgZWwuX3hfdW5kb0lmKCk7XG4gICAgZGVsZXRlIGVsLl94X3VuZG9JZjtcbiAgfTtcbiAgZWZmZWN0MygoKSA9PiBldmFsdWF0ZTIoKHZhbHVlKSA9PiB7XG4gICAgdmFsdWUgPyBzaG93KCkgOiBoaWRlKCk7XG4gIH0pKTtcbiAgY2xlYW51cDIoKCkgPT4gZWwuX3hfdW5kb0lmICYmIGVsLl94X3VuZG9JZigpKTtcbn0pO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LWlkLmpzXG5kaXJlY3RpdmUoXCJpZFwiLCAoZWwsIHsgZXhwcmVzc2lvbiB9LCB7IGV2YWx1YXRlOiBldmFsdWF0ZTIgfSkgPT4ge1xuICBsZXQgbmFtZXMgPSBldmFsdWF0ZTIoZXhwcmVzc2lvbik7XG4gIG5hbWVzLmZvckVhY2goKG5hbWUpID0+IHNldElkUm9vdChlbCwgbmFtZSkpO1xufSk7XG5pbnRlcmNlcHRDbG9uZSgoZnJvbSwgdG8pID0+IHtcbiAgaWYgKGZyb20uX3hfaWRzKSB7XG4gICAgdG8uX3hfaWRzID0gZnJvbS5feF9pZHM7XG4gIH1cbn0pO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy94LW9uLmpzXG5tYXBBdHRyaWJ1dGVzKHN0YXJ0aW5nV2l0aChcIkBcIiwgaW50byhwcmVmaXgoXCJvbjpcIikpKSk7XG5kaXJlY3RpdmUoXCJvblwiLCBza2lwRHVyaW5nQ2xvbmUoKGVsLCB7IHZhbHVlLCBtb2RpZmllcnMsIGV4cHJlc3Npb24gfSwgeyBjbGVhbnVwOiBjbGVhbnVwMiB9KSA9PiB7XG4gIGxldCBldmFsdWF0ZTIgPSBleHByZXNzaW9uID8gZXZhbHVhdGVMYXRlcihlbCwgZXhwcmVzc2lvbikgOiAoKSA9PiB7XG4gIH07XG4gIGlmIChlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IFwidGVtcGxhdGVcIikge1xuICAgIGlmICghZWwuX3hfZm9yd2FyZEV2ZW50cylcbiAgICAgIGVsLl94X2ZvcndhcmRFdmVudHMgPSBbXTtcbiAgICBpZiAoIWVsLl94X2ZvcndhcmRFdmVudHMuaW5jbHVkZXModmFsdWUpKVxuICAgICAgZWwuX3hfZm9yd2FyZEV2ZW50cy5wdXNoKHZhbHVlKTtcbiAgfVxuICBsZXQgcmVtb3ZlTGlzdGVuZXIgPSBvbihlbCwgdmFsdWUsIG1vZGlmaWVycywgKGUpID0+IHtcbiAgICBldmFsdWF0ZTIoKCkgPT4ge1xuICAgIH0sIHsgc2NvcGU6IHsgXCIkZXZlbnRcIjogZSB9LCBwYXJhbXM6IFtlXSB9KTtcbiAgfSk7XG4gIGNsZWFudXAyKCgpID0+IHJlbW92ZUxpc3RlbmVyKCkpO1xufSkpO1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvZGlyZWN0aXZlcy9pbmRleC5qc1xud2Fybk1pc3NpbmdQbHVnaW5EaXJlY3RpdmUoXCJDb2xsYXBzZVwiLCBcImNvbGxhcHNlXCIsIFwiY29sbGFwc2VcIik7XG53YXJuTWlzc2luZ1BsdWdpbkRpcmVjdGl2ZShcIkludGVyc2VjdFwiLCBcImludGVyc2VjdFwiLCBcImludGVyc2VjdFwiKTtcbndhcm5NaXNzaW5nUGx1Z2luRGlyZWN0aXZlKFwiRm9jdXNcIiwgXCJ0cmFwXCIsIFwiZm9jdXNcIik7XG53YXJuTWlzc2luZ1BsdWdpbkRpcmVjdGl2ZShcIk1hc2tcIiwgXCJtYXNrXCIsIFwibWFza1wiKTtcbmZ1bmN0aW9uIHdhcm5NaXNzaW5nUGx1Z2luRGlyZWN0aXZlKG5hbWUsIGRpcmVjdGl2ZU5hbWUsIHNsdWcpIHtcbiAgZGlyZWN0aXZlKGRpcmVjdGl2ZU5hbWUsIChlbCkgPT4gd2FybihgWW91IGNhbid0IHVzZSBbeC0ke2RpcmVjdGl2ZU5hbWV9XSB3aXRob3V0IGZpcnN0IGluc3RhbGxpbmcgdGhlIFwiJHtuYW1lfVwiIHBsdWdpbiBoZXJlOiBodHRwczovL2FscGluZWpzLmRldi9wbHVnaW5zLyR7c2x1Z31gLCBlbCkpO1xufVxuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9zcmMvaW5kZXguanNcbmFscGluZV9kZWZhdWx0LnNldEV2YWx1YXRvcihub3JtYWxFdmFsdWF0b3IpO1xuYWxwaW5lX2RlZmF1bHQuc2V0UmVhY3Rpdml0eUVuZ2luZSh7IHJlYWN0aXZlOiByZWFjdGl2ZTIsIGVmZmVjdDogZWZmZWN0MiwgcmVsZWFzZTogc3RvcCwgcmF3OiB0b1JhdyB9KTtcbnZhciBzcmNfZGVmYXVsdCA9IGFscGluZV9kZWZhdWx0O1xuXG4vLyBwYWNrYWdlcy9hbHBpbmVqcy9idWlsZHMvbW9kdWxlLmpzXG52YXIgbW9kdWxlX2RlZmF1bHQgPSBzcmNfZGVmYXVsdDtcbmV4cG9ydCB7XG4gIHNyY19kZWZhdWx0IGFzIEFscGluZSxcbiAgbW9kdWxlX2RlZmF1bHQgYXMgZGVmYXVsdFxufTtcbiIsICIvLyBwYWNrYWdlcy9pbnRlcnNlY3Qvc3JjL2luZGV4LmpzXG5mdW5jdGlvbiBzcmNfZGVmYXVsdChBbHBpbmUpIHtcbiAgQWxwaW5lLmRpcmVjdGl2ZShcImludGVyc2VjdFwiLCBBbHBpbmUuc2tpcER1cmluZ0Nsb25lKChlbCwgeyB2YWx1ZSwgZXhwcmVzc2lvbiwgbW9kaWZpZXJzIH0sIHsgZXZhbHVhdGVMYXRlciwgY2xlYW51cCB9KSA9PiB7XG4gICAgbGV0IGV2YWx1YXRlID0gZXZhbHVhdGVMYXRlcihleHByZXNzaW9uKTtcbiAgICBsZXQgb3B0aW9ucyA9IHtcbiAgICAgIHJvb3RNYXJnaW46IGdldFJvb3RNYXJnaW4obW9kaWZpZXJzKSxcbiAgICAgIHRocmVzaG9sZDogZ2V0VGhyZXNob2xkKG1vZGlmaWVycylcbiAgICB9O1xuICAgIGxldCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xuICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICBpZiAoZW50cnkuaXNJbnRlcnNlY3RpbmcgPT09ICh2YWx1ZSA9PT0gXCJsZWF2ZVwiKSlcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGV2YWx1YXRlKCk7XG4gICAgICAgIG1vZGlmaWVycy5pbmNsdWRlcyhcIm9uY2VcIikgJiYgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgICAgfSk7XG4gICAgfSwgb3B0aW9ucyk7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShlbCk7XG4gICAgY2xlYW51cCgoKSA9PiB7XG4gICAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgfSk7XG4gIH0pKTtcbn1cbmZ1bmN0aW9uIGdldFRocmVzaG9sZChtb2RpZmllcnMpIHtcbiAgaWYgKG1vZGlmaWVycy5pbmNsdWRlcyhcImZ1bGxcIikpXG4gICAgcmV0dXJuIDAuOTk7XG4gIGlmIChtb2RpZmllcnMuaW5jbHVkZXMoXCJoYWxmXCIpKVxuICAgIHJldHVybiAwLjU7XG4gIGlmICghbW9kaWZpZXJzLmluY2x1ZGVzKFwidGhyZXNob2xkXCIpKVxuICAgIHJldHVybiAwO1xuICBsZXQgdGhyZXNob2xkID0gbW9kaWZpZXJzW21vZGlmaWVycy5pbmRleE9mKFwidGhyZXNob2xkXCIpICsgMV07XG4gIGlmICh0aHJlc2hvbGQgPT09IFwiMTAwXCIpXG4gICAgcmV0dXJuIDE7XG4gIGlmICh0aHJlc2hvbGQgPT09IFwiMFwiKVxuICAgIHJldHVybiAwO1xuICByZXR1cm4gTnVtYmVyKGAuJHt0aHJlc2hvbGR9YCk7XG59XG5mdW5jdGlvbiBnZXRMZW5ndGhWYWx1ZShyYXdWYWx1ZSkge1xuICBsZXQgbWF0Y2ggPSByYXdWYWx1ZS5tYXRjaCgvXigtP1swLTldKykocHh8JSk/JC8pO1xuICByZXR1cm4gbWF0Y2ggPyBtYXRjaFsxXSArIChtYXRjaFsyXSB8fCBcInB4XCIpIDogdm9pZCAwO1xufVxuZnVuY3Rpb24gZ2V0Um9vdE1hcmdpbihtb2RpZmllcnMpIHtcbiAgY29uc3Qga2V5ID0gXCJtYXJnaW5cIjtcbiAgY29uc3QgZmFsbGJhY2sgPSBcIjBweCAwcHggMHB4IDBweFwiO1xuICBjb25zdCBpbmRleCA9IG1vZGlmaWVycy5pbmRleE9mKGtleSk7XG4gIGlmIChpbmRleCA9PT0gLTEpXG4gICAgcmV0dXJuIGZhbGxiYWNrO1xuICBsZXQgdmFsdWVzID0gW107XG4gIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSsrKSB7XG4gICAgdmFsdWVzLnB1c2goZ2V0TGVuZ3RoVmFsdWUobW9kaWZpZXJzW2luZGV4ICsgaV0gfHwgXCJcIikpO1xuICB9XG4gIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+IHYgIT09IHZvaWQgMCk7XG4gIHJldHVybiB2YWx1ZXMubGVuZ3RoID8gdmFsdWVzLmpvaW4oXCIgXCIpLnRyaW0oKSA6IGZhbGxiYWNrO1xufVxuXG4vLyBwYWNrYWdlcy9pbnRlcnNlY3QvYnVpbGRzL21vZHVsZS5qc1xudmFyIG1vZHVsZV9kZWZhdWx0ID0gc3JjX2RlZmF1bHQ7XG5leHBvcnQge1xuICBtb2R1bGVfZGVmYXVsdCBhcyBkZWZhdWx0LFxuICBzcmNfZGVmYXVsdCBhcyBpbnRlcnNlY3Rcbn07XG4iLCAiaW1wb3J0IEFscGluZSBmcm9tIFwiYWxwaW5lanNcIjtcbmltcG9ydCBpbnRlcnNlY3QgZnJvbSBcIkBhbHBpbmVqcy9pbnRlcnNlY3RcIjtcblxuKGZ1bmN0aW9uICgpIHtcbiAgQWxwaW5lLnBsdWdpbihpbnRlcnNlY3QpO1xuICB3aW5kb3cu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YyxTQUFTO0FBQUEsUUFDbkMsV0FBVyxhQUFhLFNBQVM7QUFBQSxNQUNuQztBQUNBLFVBQUlHLFlBQVcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZO0FBQ25ELGdCQUFRLFFBQVEsQ0FBQyxVQUFVO0FBQ3pCLGNBQUksTUFBTSxvQkFBb0IsVUFBVTtBQUN0QztBQUNGLFVBQUFELFVBQVM7QUFDVCxvQkFBVSxTQUFTLE1BQU0sS0FBS0MsVUFBUyxXQUFXO0FBQUEsUUFDcEQsQ0FBQztBQUFBLE1BQ0gsR0FBRyxPQUFPO0FBQ1YsTUFBQUEsVUFBUyxRQUFRLEVBQUU7QUFDbkIsTUFBQUYsU0FBUSxNQUFNO0FBQ1osUUFBQUUsVUFBUyxXQUFXO0FBQUEsTUFDdEIsQ0FBQztBQUFBLElBQ0gsQ0FBQyxDQUFDO0FBQUEsRUFDSjtBQUNBLFdBQVMsYUFBYSxXQUFXO0FBQy9CLFFBQUksVUFBVSxTQUFTLE1BQU07QUFDM0IsYUFBTztBQUNULFFBQUksVUFBVSxTQUFTLE1BQU07QUFDM0IsYUFBTztBQUNULFFBQUksQ0FBQyxVQUFVLFNBQVMsV0FBVztBQUNqQyxhQUFPO0FBQ1QsUUFBSSxZQUFZLFVBQVUsVUFBVSxRQUFRLFdBQVcsSUFBSSxDQUFDO0FBQzVELFFBQUksY0FBYztBQUNoQixhQUFPO0FBQ1QsUUFBSSxjQUFjO0FBQ2hCLGFBQU87QUFDVCxXQUFPLE9BQU8sSUFBSSxTQUFTLEVBQUU7QUFBQSxFQUMvQjtBQUNBLFdBQVMsZUFBZSxVQUFVO0FBQ2hDLFFBQUksUUFBUSxTQUFTLE1BQU0scUJBQXFCO0FBQ2hELFdBQU8sUUFBUSxNQUFNLENBQUMsS0FBSyxNQUFNLENBQUMsS0FBSyxRQUFRO0FBQUEsRUFDakQ7QUFDQSxXQUFTLGNBQWMsV0FBVztBQUNoQyxVQUFNLE1BQU07QUFDWixVQUFNLFdBQVc7QUFDakIsVUFBTSxRQUFRLFVBQVUsUUFBUSxHQUFHO0FBQ25DLFFBQUksVUFBVTtBQUNaLGFBQU87QUFDVCxRQUFJLFNBQVMsQ0FBQztBQUNkLGFBQVMsSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLO0FBQzFCLGFBQU8sS0FBSyxlQUFlLFVBQVUsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQUEsSUFDeEQ7QUFDQSxhQUFTLE9BQU8sT0FBTyxDQUFDLE1BQU0sTUFBTSxNQUFNO0FBQzFDLFdBQU8sT0FBTyxTQUFTLE9BQU8sS0FBSyxHQUFHLEVBQUUsS0FBSyxJQUFJO0FBQUEsRUFDbkQ7QUFHQSxNQUFJQyxrQkFBaUJOOzs7QUNwRHJCLEdBQUMsV0FBWTtBQUNYLG1CQUFPLE9BQU9PLGVBQVM7QUFDdkIsV0FBTyxTQUFTO0FBQ2hCLG1CQUFPLE1BQU07QUFBQSxFQUNmLEdBQUc7IiwKICAibmFtZXMiOiBbInNyY19kZWZhdWx0IiwgIkFscGluZSIsICJldmFsdWF0ZUxhdGVyIiwgImNsZWFudXAiLCAiZXZhbHVhdGUiLCAib2JzZXJ2ZXIiLCAibW9kdWxlX2RlZmF1bHQiLCAibW9kdWxlX2RlZmF1bHQiXQp9Cg==
