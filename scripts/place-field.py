"""patterns/field.css - every form control, and every state.

Written against the REAL markup, captured from a seeded checkout on 2026-08-08
and saved as claude/CHECKOUT_FIELD_MARKUP_20260808.md. The structures that
matter, and that a guess would have got wrong:

  text input   div.wc-block-components-text-input > input + label
               The LABEL COMES AFTER THE INPUT and floats over it. Any rule
               written as `label + input` matches nothing.
  select       .wc-block-components-country-input > .wc-blocks-components-select
               > .wc-blocks-components-select__container  - note wc-BLOCKS-
               components, not wc-block-components. Different prefix, same file.
  checkbox     label > input.…__input + svg.…__mark + span.…__label
               The tick is an SVG Woo owns; we colour it, we do not replace it.
  radio        .…-radio-control__option is a LABEL, and the payment methods are
               an accordion: .…-radio-control-accordion-option wrapping an
               option plus its own .…-accordion-content panel.

*** EIGHT OF THE FIELDS ON THAT PAGE ARE OURS. ***
  darling-invoice-wanted / -company / -eik / -vat / -mol / -address / -city
  darling-office-id
The Bulgarian invoice block and the courier office picker. They render through
Woo's address-form machinery, so they carry Woo's classes and inherit everything
here for free - which is the whole argument for styling the real structure
rather than inventing our own and bolting theirs on afterwards.
"""
import io, os, re, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\lora_\darling\darling-woo'
SRC = os.path.join(ROOT, 'theme', 'darling', 'src')

FIELD = '''/* =============================================================================
   PATTERN / FIELD
   Text, email, tel, select, textarea, checkbox, radio - and every state.

   *** WRITTEN AGAINST CAPTURED MARKUP, NOT AGAINST THE CLASS NAMES. ***
   See claude/CHECKOUT_FIELD_MARKUP_20260808.md. The one that would have broken
   everything: in Woo's text input the LABEL COMES AFTER THE INPUT and floats
   over it, so `label + input` matches nothing at all.

   *** A FIELD IS A BOX, A LABEL AND A MESSAGE - AND THE MESSAGE ALWAYS HAS
   ROOM. *** The error is not inserted on failure; its space is reserved from
   the start. A checkout that grows by 18px per invalid field pushes the button
   out from under the thumb that was already moving towards it.

   *** THE STATE IS NEVER COLOUR ALONE. *** An invalid field gets a thicker
   edge, an icon and a message. Roughly one man in twelve cannot separate the
   red edge from the grey one, and on a phone in daylight neither can anyone
   else.
   ========================================================================== */

.d-field{
	position:relative;
	display:grid;
	gap:var(--stack-tight);
	margin-bottom:var(--space-2xs);
}

/* -- the control ------------------------------------------------------------
   One ruleset for every text-like control plus select and textarea. They differ
   in behaviour, not in appearance, and a select that does not match the input
   beside it is the most common way a form looks homemade. */
.d-field__control,
.d-field input[type="text"],
.d-field input[type="email"],
.d-field input[type="tel"],
.d-field input[type="number"],
.d-field input[type="password"],
.d-field input[type="search"],
.d-field select,
.d-field textarea{
	width:100%;
	min-height:2.9em;
	padding:.72em .9em;
	font:var(--type-body);
	color:var(--c-cocoa);
	background:var(--surface-raised);
	border:1px solid var(--edge-field);
	border-radius:var(--radius-s);
	appearance:none;
	transition:border-color var(--dur-ui) var(--ease-float),
	           box-shadow var(--dur-ui) var(--ease-float);
}
.d-field textarea{ min-height:6em; resize:vertical; line-height:var(--lh-body) }

.d-field__control::placeholder,
.d-field input::placeholder,
.d-field textarea::placeholder{ color:var(--ink-placeholder) }

.d-field__control:hover,
.d-field input:hover,
.d-field select:hover,
.d-field textarea:hover{ border-color:var(--c-mauve-light) }

/* Focus is a RING plus a colour, never a colour alone - and never the browser
   default outline removed with nothing put back.

   *** FOCUS IS COCOA, NOT THE ACTION COLOUR. *** It used to take --action, and
   on a form that reads as a warning: a red-ish edge appearing the moment you
   click into a field says "this is wrong" before you have typed anything. Red
   belongs to the invalid state and nowhere else on a form. Cocoa is the calmest
   thing in the palette that still clearly is not the resting edge. */
.d-field__control:focus,
.d-field input:focus,
.d-field select:focus,
.d-field textarea:focus{
	outline:none;
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}

.d-field__label{
	font:var(--fw-medium) var(--fs-meta)/var(--lh-title) var(--font-ui);
	color:var(--c-cocoa);
}
.d-field__hint{ font-size:var(--fs-fine); color:var(--ink-quiet) }

/* -- the message, whose space is always reserved ---------------------------- */
.d-field__error{
	display:flex;
	align-items:center;
	gap:.4em;
	min-height:1.25em;
	font-size:var(--fs-fine);
	line-height:1.25;
	color:var(--notice-error-edge);
}
.d-field__error:empty::before{ content:""; display:block }
.d-field__error:not(:empty)::before{
	content:"";
	flex:0 0 auto;
	width:.85em;
	height:.85em;
	background:var(--notice-error-edge);
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
}

.d-field--invalid .d-field__control,
.d-field--invalid input,
.d-field--invalid select,
.d-field--invalid textarea{
	border-width:2px;
	border-color:var(--notice-error-edge);
	background:color-mix(in oklab, var(--notice-error-edge) 5%, var(--surface-raised));
}
.d-field--invalid .d-field__control:focus,
.d-field--invalid input:focus{
	box-shadow:0 0 0 3px color-mix(in oklab, var(--notice-error-edge) 26%, transparent);
}

.d-field--disabled .d-field__control,
.d-field :disabled{
	background:var(--surface-quiet);
	color:var(--ink-quiet);
	cursor:not-allowed;
	border-color:var(--hairline);
}

/* -- select: the arrow is ours, because appearance:none removes theirs ------ */
.d-field select,
.d-select{
	padding-right:2.4em;
	background-image:
		linear-gradient(45deg, transparent 50%, var(--ink-quiet) 50% 62%, transparent 62%),
		linear-gradient(-45deg, transparent 50%, var(--ink-quiet) 50% 62%, transparent 62%);
	background-size:.42em .42em, .42em .42em;
	background-position:right 1.1em top 55%, right .78em top 55%;
	background-repeat:no-repeat;
	cursor:pointer;
}

/* -- THE DROPDOWN MENU ITSELF -----------------------------------------------
   *** THIS IS NEW AND IT IS WHY IT IS POSSIBLE AT ALL. ***
   The list a native <select> opens is drawn by the operating system, not by the
   page, and for twenty years it could not be styled - which is why every design
   system on the web either lived with the OS menu or rebuilt the whole control
   in JavaScript with a div, a listbox role and a keyboard implementation nobody
   maintains. `appearance: base-select` hands the menu back to CSS. Verified
   supported in this Chrome before writing it.

   Wrapped in @supports on purpose: where it is missing the browser keeps its own
   menu, which is correct behaviour and not a fallback we have to build. The
   control itself is styled either way - only the open list changes. */
@supports (appearance: base-select){
	.d-field select,
	.d-select,
	.d-field select::picker(select),
	.d-select::picker(select){
		appearance:base-select;
	}
	.d-field select::picker(select),
	.d-select::picker(select){
		margin-top:.35em;
		padding:var(--space-3xs);
		border:1px solid var(--edge-field);
		border-radius:var(--radius-m);
		background:var(--surface-raised);
		box-shadow:var(--shadow-card);
	}
	.d-field option,
	.d-select option{
		padding:.52em .7em;
		border-radius:var(--radius-xs);
		color:var(--c-cocoa);
		background:transparent;
		font:var(--type-body);
	}
	/* The highlight is a LIGHT cherry, not the cherry itself: a solid cherry row
	   under a cocoa word is 3.1:1 and fails, and the row you are hovering is the
	   one you most need to be able to read. */
	.d-field option:hover,
	.d-select option:hover{
		background:color-mix(in oklab, var(--c-cherry) 16%, var(--surface-raised));
	}
	.d-field option:checked,
	.d-select option:checked{
		background:color-mix(in oklab, var(--c-cherry) 26%, var(--surface-raised));
		font-weight:var(--fw-medium);
	}
	/* base-select draws its own arrow; ours is the background gradient above. */
	.d-field select::picker-icon,
	.d-select::picker-icon{ display:none }
	.d-field select::checkmark,
	.d-select::checkmark{ display:none }
}

/* -- checkbox and radio -----------------------------------------------------
   Drawn, not native: a native checkbox cannot be coloured on every platform,
   and the one on the checkout is the control that says "same address for
   billing", which is the single most-clicked control in the flow. */
.d-check{
	display:grid;
	grid-template-columns:auto 1fr;
	gap:var(--inline);
	align-items:start;
	cursor:pointer;
	font-size:var(--fs-meta);
}
.d-check input{
	appearance:none;
	width:1.18em;
	height:1.18em;
	margin:.14em 0 0;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-xs);
	background:var(--surface-raised);
	display:grid;
	place-content:center;
	cursor:pointer;
	transition:background var(--dur-ui) var(--ease-float),
	           border-color var(--dur-ui) var(--ease-float);
}
.d-check input[type="radio"]{ border-radius:var(--radius-circle) }
.d-check input::before{
	content:"";
	width:.62em;
	height:.62em;
	transform:scale(0);
	transition:transform 140ms var(--ease-float);
	background:var(--action-ink);
	clip-path:polygon(14% 52%, 8% 60%, 38% 88%, 92% 26%, 84% 18%, 38% 70%);
}
.d-check input[type="radio"]::before{
	clip-path:none;
	border-radius:var(--radius-circle);
	width:.52em; height:.52em;
}
.d-check input:checked{ background:var(--action); border-color:var(--action) }
.d-check input:checked::before{ transform:scale(1) }
.d-check input:focus-visible{
	outline:2px solid var(--action);
	outline-offset:2px;
}

/* =============================================================================
   ADOPTED: WooCommerce's checkout
   Everything below styles markup we do not emit, and the structures come from
   the capture rather than from the class names.
   ========================================================================== */

/* -- text input: the label FLOATS, and it comes after the input -------------
   Woo's own CSS gives this a floating label; we keep the behaviour because the
   markup is built for it and fighting it means absolutely positioning a label
   Woo also positions. What changes is the box, the colours and the ring. */
.wc-block-components-text-input{
	position:relative;
	margin:0 0 var(--space-2xs);
}

/* *** THE SELECTOR SHAPE HERE IS LOAD-BEARING. MEASURED. ***
   Being unlayered is necessary and not sufficient. Woo's rule is
     .wc-block-components-form .wc-block-components-text-input input[type=email]
   which is (0,3,1). Ours was
     .wc-block-components-text-input input[type=text]
   which is (0,2,1) - so with both sides unlayered, specificity decided and we
   lost by exactly one class. border-radius stayed 4px and the background stayed
   white however the layers were arranged.

   So: match Woo's ancestor, keep the attribute selectors, and repeat the class
   once to land at (0,4,1). The repetition is deliberate and is the conventional
   way to add specificity without inventing an ancestor that may not exist or
   reaching for !important. Do not "tidy" it away.

   Note also what currently holds the live site together: style.css does this
   with !important at (0,8,4). That is the thing being replaced. */
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[type="text"],
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[type="email"],
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[type="tel"],
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[type="number"],
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[type="password"]{
	width:100%;
	min-height:3.2em;
	padding:1.35em .9em .5em;   /* room for the floated label above the value */
	font:var(--type-body);
	color:var(--c-cocoa);
	background:var(--surface-raised);
	border:1px solid var(--edge-field);
	border-radius:var(--radius-s);
	box-shadow:none;
	transition:border-color var(--dur-ui) var(--ease-float),
	           box-shadow var(--dur-ui) var(--ease-float);
}
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input:hover{ border-color:var(--c-mauve-light) }
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input:focus{
	outline:none;
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input label{
	position:absolute;
	left:.95em;
	top:1em;
	margin:0;
	font:var(--fs-body)/1 var(--font-ui);
	color:var(--ink-placeholder);
	pointer-events:none;
	transform-origin:left top;
	transition:transform 140ms var(--ease-float), color 140ms var(--ease-float);
}
/* Float on focus OR when filled. :not(:placeholder-shown) is what covers
   "filled" without a class and without script - Woo sets a placeholder of a
   single space precisely so this works. */
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input:focus + label,
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input:not(:placeholder-shown) + label,
.wc-block-components-form .wc-block-components-text-input.is-active label{
	transform:translateY(-.62em) scale(.78);
	color:var(--ink-quiet);
}
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input:focus + label{ color:var(--action) }

/* invalid. aria-invalid is the ONLY reliable signal here - Woo toggles it on
   the input itself, and the has-error class is not always applied to the same
   ancestor between the checkout and the my-account form. */
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[aria-invalid="true"],
.wc-block-components-form .wc-block-components-text-input.has-error input{
	border-width:2px;
	border-color:var(--notice-error-edge);
	background:color-mix(in oklab, var(--notice-error-edge) 5%, var(--surface-raised));
}
.wc-block-components-form .wc-block-components-text-input.wc-block-components-text-input input[aria-invalid="true"]:focus{
	box-shadow:0 0 0 3px color-mix(in oklab, var(--notice-error-edge) 26%, transparent);
}

.wc-block-components-validation-error{
	display:flex;
	align-items:center;
	gap:.4em;
	margin:.34em 0 0;
	font-size:var(--fs-fine);
	line-height:1.3;
	color:var(--notice-error-edge);
}
.wc-block-components-validation-error::before{
	content:"";
	flex:0 0 auto;
	width:.85em;
	height:.85em;
	background:var(--notice-error-edge);
	clip-path:polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%);
}
.wc-block-components-validation-error p{ margin:0 }

/* -- select. NOTE THE PREFIX: wc-BLOCKS-components, not wc-block-components.
   Two conventions in one plugin; the capture is the only reason this is right. */
.wc-block-components-form .wc-blocks-components-select__container.wc-blocks-components-select__container{
	position:relative;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-s);
	background:var(--surface-raised);
	transition:border-color var(--dur-ui) var(--ease-float),
	           box-shadow var(--dur-ui) var(--ease-float);
}
.wc-blocks-components-select__container:hover{ border-color:var(--c-mauve-light) }
.wc-blocks-components-select__container:focus-within{
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}
.wc-block-components-form .wc-blocks-components-select__select,
.wc-block-components-form .wc-block-components-country-input.wc-block-components-country-input select,
.wc-block-components-form .wc-block-components-state-input.wc-block-components-state-input select{
	width:100%;
	min-height:3.2em;
	padding:1.35em 2.4em .5em .9em;
	font:var(--type-body);
	color:var(--ink);
	color:var(--c-cocoa);
	background:transparent;
	border:0;
	outline:none;
	appearance:none;
	cursor:pointer;
}

/* Woo's country and state pickers get the styled menu too. */
@supports (appearance: base-select){
	.wc-block-components-form select,
	.wc-block-components-form select::picker(select){ appearance:base-select }
	.wc-block-components-form select::picker(select){
		margin-top:.35em;
		padding:var(--space-3xs);
		border:1px solid var(--edge-field);
		border-radius:var(--radius-m);
		background:var(--surface-raised);
		box-shadow:var(--shadow-card);
	}
	.wc-block-components-form option{
		padding:.52em .7em;
		border-radius:var(--radius-xs);
		color:var(--c-cocoa);
		background:transparent;
	}
	.wc-block-components-form option:hover{
		background:color-mix(in oklab, var(--c-cherry) 16%, var(--surface-raised));
	}
	.wc-block-components-form option:checked{
		background:color-mix(in oklab, var(--c-cherry) 26%, var(--surface-raised));
		font-weight:var(--fw-medium);
	}
	.wc-block-components-form select::picker-icon,
	.wc-block-components-form select::checkmark{ display:none }
}
.wc-blocks-components-select__label,
.wc-block-components-country-input label,
.wc-block-components-state-input label{
	position:absolute;
	left:.95em;
	top:.62em;
	font:var(--fs-fine)/1 var(--font-ui);
	color:var(--ink-quiet);
	pointer-events:none;
}
.wc-blocks-components-select__expand{ display:none }   /* ours is drawn below */
.wc-blocks-components-select__container::after{
	content:"";
	position:absolute;
	right:1em;
	top:50%;
	width:.5em;
	height:.5em;
	margin-top:-.32em;
	border-right:2px solid var(--ink-quiet);
	border-bottom:2px solid var(--ink-quiet);
	transform:rotate(45deg);
	pointer-events:none;
}

/* -- checkbox. The tick is an SVG Woo renders; we colour the box and the mark,
   we do not try to replace it. */
.wc-block-components-checkbox{ margin:0 0 var(--space-2xs) }
.wc-block-components-checkbox label{
	display:grid;
	grid-template-columns:auto 1fr;
	gap:var(--inline);
	align-items:start;
	cursor:pointer;
	font-size:var(--fs-meta);
	line-height:var(--lh-body);
	position:relative;
}
.wc-block-components-form .wc-block-components-checkbox__input.wc-block-components-checkbox__input[type="checkbox"]{
	appearance:none;
	grid-column:1;
	width:1.2em;
	height:1.2em;
	margin:.16em 0 0;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-xs);
	background:var(--surface-raised);
	cursor:pointer;
	transition:background var(--dur-ui) var(--ease-float),
	           border-color var(--dur-ui) var(--ease-float);
}
.wc-block-components-form .wc-block-components-checkbox__input.wc-block-components-checkbox__input:checked{
	background:var(--action);
	border-color:var(--action);
}
.wc-block-components-checkbox__input:focus-visible{
	outline:2px solid var(--action);
	outline-offset:2px;
}
.wc-block-components-checkbox__mark{
	grid-column:1;
	grid-row:1;
	align-self:start;
	width:1.2em;
	height:1.2em;
	margin-top:.16em;
	fill:var(--action-ink);
	pointer-events:none;
}
.wc-block-components-checkbox__label{ grid-column:2 }

/* -- radio, and the payment accordion --------------------------------------
   The option is a LABEL, and each payment method is an accordion option with
   its own content panel that expands when checked. */
.wc-block-components-form .wc-block-components-radio-control__option.wc-block-components-radio-control__option{
	display:grid;
	grid-template-columns:auto 1fr;
	gap:var(--inline);
	align-items:center;
	padding:var(--space-2xs) var(--space-xs);
	margin:0;
	cursor:pointer;
	font-size:var(--fs-meta);
}
.wc-block-components-form .wc-block-components-radio-control-accordion-option.wc-block-components-radio-control-accordion-option{
	border:1px solid var(--edge-field);
	border-radius:var(--radius-m);
	background:var(--surface-raised);
	margin-bottom:var(--space-2xs);
	overflow:hidden;
	transition:border-color var(--dur-ui) var(--ease-float),
	           background var(--dur-ui) var(--ease-float);
}
.wc-block-components-radio-control-accordion-option:hover{ border-color:var(--c-mauve-light) }
.wc-block-components-radio-control-accordion-option--checked-option-highlighted,
.wc-block-components-radio-control__option-checked{
	border-color:var(--action);
	background:color-mix(in oklab, var(--action) 7%, var(--surface-raised));
}
.wc-block-components-radio-control__input{
	appearance:none;
	width:1.18em;
	height:1.18em;
	margin:0;
	border:1px solid var(--edge-field);
	border-radius:var(--radius-circle);
	background:var(--surface-raised);
	display:grid;
	place-content:center;
	cursor:pointer;
}
.wc-block-components-radio-control__input::before{
	content:"";
	width:.54em;
	height:.54em;
	border-radius:var(--radius-circle);
	background:var(--action-ink);
	transform:scale(0);
	transition:transform 140ms var(--ease-float);
}
.wc-block-components-radio-control__input:checked{
	background:var(--action);
	border-color:var(--action);
}
.wc-block-components-radio-control__input:checked::before{ transform:scale(1) }
.wc-block-components-radio-control__input:focus-visible{
	outline:2px solid var(--action);
	outline-offset:2px;
}
.wc-block-components-radio-control__label{ font-weight:var(--fw-medium) }
.wc-block-components-radio-control-accordion-content{
	padding:0 var(--space-xs) var(--space-2xs) calc(var(--space-xs) + 1.18em + var(--inline));
	font-size:var(--fs-fine);
	color:var(--ink-quiet);
}

/* -- the classic templates' fields, for my-account and the review form ------ */
.woocommerce form .form-row input.input-text,
.woocommerce form .form-row textarea,
.woocommerce form .form-row select,
.woocommerce-page form .form-row input.input-text{
	width:100%;
	min-height:2.9em;
	padding:.72em .9em;
	font:var(--type-body);
	color:var(--c-cocoa);
	background:var(--surface-raised);
	border:1px solid var(--edge-field);
	border-radius:var(--radius-s);
	appearance:none;
}
.woocommerce form .form-row input.input-text:focus,
.woocommerce form .form-row textarea:focus,
.woocommerce form .form-row select:focus{
	outline:none;
	border-color:var(--c-cocoa);
	box-shadow:0 0 0 3px color-mix(in oklab, var(--c-cocoa) 22%, transparent);
}
.woocommerce form .form-row label{
	display:block;
	margin-bottom:var(--stack-tight);
	font:var(--fw-medium) var(--fs-meta)/var(--lh-title) var(--font-ui);
	color:var(--c-cocoa);
}
.woocommerce form .form-row.woocommerce-invalid input.input-text{
	border-width:2px;
	border-color:var(--notice-error-edge);
}
.woocommerce form .form-row.woocommerce-validated input.input-text{
	border-color:color-mix(in oklab, var(--g-core) 60%, var(--edge-field));
}
'''


def main():
    p = os.path.join(SRC, 'patterns', 'field.css')
    assert all(ord(ch) < 128 for ch in FIELD)
    assert FIELD.count('/*') == FIELD.count('*/'), (FIELD.count('/*'), FIELD.count('*/'))
    io.open(p, 'w', encoding='ascii', newline='\n').write(FIELD)
    print('wrote  patterns/field.css %5d bytes' % len(FIELD))

    ip = os.path.join(SRC, 'index.css')
    index = io.open(ip, encoding='utf-8').read()
    if 'patterns/field.css' not in index:
        anchor = next(l for l in index.splitlines()
                      if 'patterns/rating.css' in l and '@import' in l)
        index = index.replace(anchor,
                              anchor + '\n@import url("patterns/field.css")   layer(patterns);', 1)
        io.open(ip, 'w', encoding='utf-8', newline='\n').write(index)
        print('index.css: registered patterns/field.css')

    declared = set()
    for dp, _, names in os.walk(SRC):
        for n in names:
            if n.endswith('.css'):
                t = io.open(os.path.join(dp, n), encoding='utf-8').read()
                declared |= set(re.findall(r'^\s*(--[a-z0-9-]+)\s*:', t, re.M))
    body = re.sub(r'/\*[\s\S]*?\*/', '', FIELD)
    missing = sorted({m for m in re.findall(r'var\(\s*(--[a-z0-9-]+)\s*\)', body)
                      if m not in declared})
    if missing:
        print('MISSING TOKENS: ' + ', '.join(missing))
        raise SystemExit(1)
    print('token check: ok')


main()
