// Arousal: when the calm routine gives way to exploring and learning. The body computes it from
// what just happened: an outcome that stands out, pain, company, something new in view, or a
// need left unmet. A meal, a drink and a night's sleep are routine and leave Mochi calm.
// Every constant here is a gene.

// `need` above 1 switches the need-forced arousal off: a hungry Mochi that explores at random
// does not eat, and going to the bowl is routine. Only hunger and thirst can force it.
export const AROUSAL = { decay: 0.9, threshold: 0.2, floor: 0.15, gain: 1.0, social: 0.5, novelty: 0.15, need: 0.85 };

export class Arousal {
  constructor(genes = {}) {
    this.genes = { ...AROUSAL, ...genes };
    this.level = 0; this.surprise = 0;
  }
  // outcome: {reward, pain, social} since the last decision; novelty in [0, 1]; needs: the five needs
  update(outcome, novelty, needs) {
    const g = this.genes;
    this.surprise = Math.max(0, Math.abs(outcome.reward) - g.floor);
    this.level = g.decay * this.level + g.gain * this.surprise
      + outcome.pain + g.social * outcome.social + g.novelty * novelty;
    if (needs.hunger > g.need || needs.thirst > g.need) this.level = Math.max(this.level, 1);
    this.level = Math.min(this.level, 3);
    return this.level >= g.threshold;
  }
  snapshot() { return { level: this.level, genes: this.genes }; }
  static restore(saved) {
    // saves from before the wake fix carry the old default need: 2; they get the new value too
    const genes = { ...saved.genes };
    if (genes.need === 2) genes.need = AROUSAL.need;
    const out = new Arousal(genes);
    out.level = saved.level;
    return out;
  }
}
