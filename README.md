# bunakendiversseabreeze.github.io
Static website for Bunaken Divers Seabreeze Resort

## Jekyll templating
Jekyll formatting is used to reduce repetition and create shareable blocks of HTML. Jekyll is a built-in feature of GitHub pages.

A HTML page using Jekyll specifies a YAML block at the top that states the layout to use (from the `_layouts` folder) alongside other variables to be injected into the template HTML. 

These variables are called in the template with `page.variable_name`. `{{ content }} is used to populate the content that is specified after the YAML block in the calling file (e.g. standard-bungalow.html).

For example, `standard-bungalow.html` specifies the price, tagline, and images to be used when the template in `_layouts/bungalow.html` is rendered.

Layer chaining is also used in the layouts. E.g., bungalow.html inherits from default.html
