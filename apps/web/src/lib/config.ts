export const siteConfig = {
  name: "Free Models",
  headline: { first: "Make", second: "more", punctuation: "." },
  tagline: "Spend less.",
  description: "Free AI models for whatever you’re building.",
  socialPrice: "0$",
  links: {
    github: "https://github.com/zack-o-zack/free-models-backend",
  },
};

export const homeTitle = `${siteConfig.headline.first} ${siteConfig.headline.second}${siteConfig.headline.punctuation} ${siteConfig.tagline}`;
export const socialImageAlt = `${siteConfig.name} — ${homeTitle} ${siteConfig.socialPrice}.`;
