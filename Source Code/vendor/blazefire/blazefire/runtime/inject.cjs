/**
 * Blazefire client runtime (webpack entry)
 *
 * Injected as an entry by the next.config plugin, so it runs before any
 * application code. SSR-safe: bails out immediately on the server.
 *
 * Branding content is imported from ../branding.js so there is exactly one
 * source of truth for the theme.
 */

'use strict'

var branding = require('../branding.cjs')

if (typeof document !== 'undefined') {
  inject()
  injectOverlayTheme()
}

function inject() {
  if (document.getElementById('blazefire-styles')) return

  var style = document.createElement('style')
  style.id = 'blazefire-styles'
  style.setAttribute('data-blazefire', branding.BLAZEFIRE_BRANDING.version)
  style.textContent = branding.blazefireStyles()

  if (document.head) {
    document.head.appendChild(style)
  } else {
    // document.head can be missing very early; retry on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.getElementById('blazefire-styles')) {
        document.head.appendChild(style)
      }
    })
  }
}

/**
 * The dev overlay renders inside a shadow root, so the document-level theme
 * above cannot reach it. We inject a token-override stylesheet directly into
 * that shadow root instead — recolouring the overlay without touching Next's
 * own markup or styles.
 *
 * Colours are only half the job. The overlay also carries literal brand
 * *text* — the "Next.js 16.3.8" / "Turbopack" pills and the dev-tools
 * button's aria-label — which no stylesheet can change. Those are rewritten
 * in the DOM too (applyLabels). The "N" glyph is a graphic, so it is swapped
 * for the flame purely in CSS by blazefireOverlayStyles.
 *
 * The portal is created asynchronously, and React re-renders can restore
 * Next's own text at any moment, so we keep watching.
 */
function injectOverlayTheme() {
  var css = branding.blazefireOverlayStyles()
  var labels = branding.BLAZEFIRE_BRANDING.labels || []
  var observed = []

  function applyTheme(root) {
    if (!root.getElementById('blazefire-overlay-styles')) {
      var style = document.createElement('style')
      style.id = 'blazefire-overlay-styles'
      style.setAttribute('data-blazefire', 'overlay')
      style.textContent = css
      root.appendChild(style)
    }
  }

  /**
   * Rewrite Next's brand strings. Every write is conditional, so this is
   * idempotent: once rewritten, a pass produces no DOM changes and the
   * MutationObserver it may trigger has nothing to do.
   *
   * Only TEXT and attribute values are touched — never an element — because
   * React tolerates a changed text node but throws if we delete a node it
   * owns. The flame mark is likewise done in CSS, by blazefireOverlayStyles.
   */
  function applyLabels(root) {
    for (var i = 0; i < labels.length; i++) {
      var L = labels[i]
      var els
      try {
        els = root.querySelectorAll(L.selector)
      } catch (e) {
        continue // a selector Next renamed should never break the runtime
      }

      for (var j = 0; j < els.length; j++) {
        var el = els[j]

        if (L.attribute) {
          var cur = el.getAttribute(L.attribute)
          if (cur !== null && L.match.test(cur)) {
            setAttr(el, L.attribute, cur.replace(L.match, L.replace))
          }
        } else {
          var tn = textChild(el)
          if (tn && L.match.test(tn.data)) {
            var next = tn.data.replace(L.match, L.replace)
            if (next !== tn.data) tn.data = next
          }
        }

        if (L.title) setAttr(el, 'title', L.title)
      }
    }
  }

  function rebrand(root) {
    applyTheme(root)
    applyLabels(root)
    watchShadowRoot(root)
  }

  function scan() {
    // Tag name comparison is case-insensitive via querySelector on the
    // lowercased custom element name.
    var portals = document.querySelectorAll('nextjs-portal, blazefire-portal')
    for (var i = 0; i < portals.length; i++) {
      if (portals[i].shadowRoot) rebrand(portals[i].shadowRoot)
    }
  }

  /**
   * Mutations *inside* a shadow root are never reported to observers on
   * document — they don't cross the boundary. So each themed shadow root
   * gets its own observer, which catches React restoring Next's strings.
   */
  function watchShadowRoot(root) {
    if (typeof MutationObserver === 'undefined') return
    for (var i = 0; i < observed.length; i++) {
      if (observed[i] === root) return
    }
    observed.push(root)

    var rebrander = new MutationObserver(function () {
      // React may have re-rendered (restoring Next's strings) or dropped our
      // <style>; both are repaired here. applyTheme/applyLabels only write
      // when something actually differs, so this settles instead of looping.
      rebrand(root)
    })
    rebrander.observe(root, { childList: true, subtree: true, characterData: true })
  }

  scan()

  if (typeof MutationObserver !== 'undefined' && document.body) {
    // Long-lived: the overlay mounts, is dismissed and can come back.
    var observer = new MutationObserver(function () {
      scan()
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

function textChild(el) {
  var node = el.firstChild
  while (node) {
    if (node.nodeType === 3 && node.data.trim()) return node
    node = node.nextSibling
  }
  return null
}

function setAttr(el, name, value) {
  if (el.getAttribute(name) !== value) el.setAttribute(name, value)
}

// HMR: re-inject if the stylesheet gets dropped during a fast refresh
if (typeof module !== 'undefined' && module.hot) {
  module.hot.accept()
}
