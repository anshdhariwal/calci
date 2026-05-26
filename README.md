# calci 🧮

> your math went into a terminal. it left solved.

a dead-simple python CLI calculator that evaluates expressions without making you unlock your phone or open a heavy browser tab. no config, no bloated UI, no drama.

---

## why?

because typing `5.5 * (12.4 + 3.1)` into Google at 3am just to get a quick number is **not it**.

calci does the basic math so you can focus on pretending you're writing complex algorithms.

---

## how it works

```
you type expression → you press enter → you get answer → done.
```

that's it. that's the tool.

---

## quick start

```bash
cd calci
python calci.py
```

---

## requirements

- python 3.10+
- basic math skills (optional, the tool does it anyway)
- the will to avoid opening a GUI calculator

no extra libraries needed—runs completely on python's standard library.

---

## features

| thing | status |
|---|---|
| basic arithmetic | ✓ (addition, subtraction, multiplication, division) |
| parentheses support | ✓ (because PEMDAS is actually important) |
| floating point accuracy | ✓ (clean decimal handling) |
| zero division safety | ✓ (returns `infinity` or `error` instead of crashing) |
| expression history | ✓ (optional - scroll through your past calculations) |
| interactive repl mode | ✓ (type numbers until you get bored) |

---

## the output

your terminal output comes with:
- a clean, distraction-free answer
- optional step-by-step breakdown (if you want to double-check the logic)
- clear error messages when you inevitably type two operators in a row

basically, it looks like you know how math works. finally.

---

## use cases

- **quick coding math** - calculate arrays offsets, pixel sizes, or grid layouts right next to your editor.
- **splitting dinner bills** - do the math without your friends seeing your notifications or your messy home screen.
- **sanity checks** - confirm that `18 - 9` is indeed `9` because sometimes your brain just goes blank.
- **lazy taxes** - add up receipts without opening spreadsheet software that requires a subscription.

---

## faq- you may ask

**Q: does it support graphing?**
A: no. this is calci, not desmos.

**Q: can it solve calculus?**
A: if you need integrals, you're in the wrong place. go back to wolfram alpha.

**Q: why is it called calci?**
A: because "calculator" has too many letters. efficiency.

**Q: does it use `eval()`?**
A: absolutely not. we actually parse your math properly. we are lazy, but we aren't security-risk lazy.

---

## changelog

- **v1** - initial version of the tool. simple enough.

---

## made by

**[@anshdhariwal](https://github.com/anshdhariwal)** built this instead of using mental math.

---

*if this saved you from a brain fart, drop a star or just silently appreciate it. both are cool. *
