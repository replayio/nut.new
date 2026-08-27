import './ShutdownAnnouncement.css';

export function ShutdownAnnouncement() {
  return (
    <div className="shutdown-page" data-testid="shutdown-announcement">
      <div className="shutdown-page__card">
        <div className="shutdown-page__brand">
          <img src="/images/logo.svg" alt="" width="26" height="30" className="shutdown-page__logo" />
          <span className="shutdown-page__wordmark">Replay QA</span>
        </div>

        <h1 className="shutdown-page__title">Replay Builder has shut down</h1>

        <p className="shutdown-page__lead">
          Replay Builder has evolved into{' '}
          <a href="https://www.replay.io/" rel="noopener noreferrer">
            Replay QA
          </a>
          .
        </p>

        <p className="shutdown-page__lead">
          If you have any questions or concerns,{' '}
          <a href="https://www.replay.io/contact" rel="noopener noreferrer">
            let us know
          </a>
          .
        </p>

        <a className="shutdown-page__btn" href="https://www.replay.io/" rel="noopener noreferrer">
          Go to Replay QA
        </a>

        <p className="shutdown-page__footer">
          Or{' '}
          <a href="https://www.replay.io/contact" rel="noopener noreferrer">
            contact the team
          </a>
          .
        </p>
      </div>
    </div>
  );
}
