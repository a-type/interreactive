import 'react-app-polyfill/ie11';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Select } from './Select';
import { RovingTab } from './RovingTab';
import TreeDemo from './Tree';

const App = () => {
  return (
    <main>
      <h1>interreactive</h1>
      <section>
        <p>
          Welcome. Please check your mouse at the door; we use keyboards only
          here. Enjoy your stay.
        </p>
      </section>
      <section>
        <h2>about</h2>
        <p>
          <a href="https://github.com/a-type/interreactive">interreactive</a> is
          the missing selection manager for React. It enables complex keyboard
          selection interactions in your components with a set of easy-to-use
          tools.
        </p>
      </section>
      <section>
        <h2>option selection</h2>
        <p>
          It wouldn't be a selection tool without an autocomplete input demo.
          interreactive provides tooling to control visual selection via a
          disconnected element's keyboard interactions. By connecting an
          interactive input to a list of options, you can create your own
          customized autocomplete experience with just a few hooks.
        </p>
        <Select />
        <p>
          In the demo above, you can even type in your own values to add new
          items. interreactive doesn't get in the way of customized behaviors
          you want to implement, or force you to implement them in specific
          ways. It handles the interactivity of selecting items from the list -
          that's all.
        </p>
      </section>
      <section>
        <h2>"roving tab index"</h2>
        <RovingTab />
      </section>
      <section>
        <h2>tree</h2>
        <p>
          Using the flexible tools provided, you can create complex selection
          interaction, like tree views.
        </p>
        <TreeDemo />
      </section>
      <section>
        <a href="https://a-type.github.io/interreactive/lib">
          <h2>library documentation</h2>
        </a>
      </section>
    </main>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));