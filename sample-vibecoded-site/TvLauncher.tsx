export default function TvLauncher() {
  return (
    <main class="container">
        <nav class="nav-menu">
            <a href="#" class="navbar_link_new" data-animate="nav-reveal" style="--link-color: #0166FF;" data-text="ABOUT" data-asset="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExc21yYXFva29uM3ZrcTc5Y2gyZGdlZXliNTBtbHczNzZ0OHZua3NzMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NEU34P7OlWe1a/giphy.gif">
                <div class="bg-block"></div>
                <span class="text">ABOUT</span>
            </a>
            <a href="#" class="navbar_link_new" data-animate="nav-reveal" style="--link-color: #F082D9;" data-text="LATEST WORK" data-asset="https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif">
                <div class="bg-block"></div>
                <span class="text">PORTFOLIO</span>
            </a>
            <a href="#" class="navbar_link_new" data-animate="nav-reveal" style="--link-color: #F65D34;" data-text="OUR SERVICES" data-asset="https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXNvMDM3cmQwd2QzaGQ1Z3R1NDVoaDlwdmY2cG1wdnA1NXZoMzVwYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/dxgEz5tWSRMk1tsyrt/giphy.gif">
                <div class="bg-block"></div>
                <span class="text">SERVICES</span>
            </a>
            <a href="#" class="navbar_link_new" data-animate="nav-reveal" style="--link-color: #EDC43B;" data-text="PROCESS" data-asset="https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGN2ejhjMWFodzF6emxneG9wcmg4NDlvc2w3aW9hYWJnOHhqNGRzNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Iyqv0kE4hUwYE/giphy.gif">
                <div class="bg-block"></div>
                <span class="text">PROCESS</span>
            </a>
            <a href="#" class="navbar_link_new" data-animate="nav-reveal" style="--link-color: #5CAC57;" data-text="CONTACT" data-asset="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3p0aGh5ODBmY205OW9leWQ0MnBlMDkybmZvdXN1NXg2ajQ5ZGFjcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/REI7TGEUOwdE4gEUvO/giphy.gif">
                <div class="bg-block"></div>
                <span class="text">CONTACT</span>
            </a>
        </nav>

        <div class="tv-wrapper">
            <div class="tv-bloom"></div>

            <div class="monitor-rig">
                <div class="antenna-array">
                    <div class="antenna"><div class="antenna-rod"></div><div class="antenna-joint"></div></div>
                    <div class="antenna"><div class="antenna-rod"></div><div class="antenna-joint"></div></div>
                    <div class="antenna"><div class="antenna-rod"></div><div class="antenna-joint"></div></div>
                    <div class="antenna"><div class="antenna-rod"></div><div class="antenna-joint"></div></div>
                    <div class="antenna"><div class="antenna-rod"></div><div class="antenna-joint"></div></div>
                </div>

                <div class="rig-handle left-handle">
                    <div class="handle-grip"></div>
                    <div class="handle-arm"></div>
                </div>

                <div class="monitor-chassis">
                    <div class="tv-screen" id="tv-link">
                        <div class="tv-viewfinder">
                            <div class="corner tl"></div>
                            <div class="corner tr"></div>
                            <div class="corner bl"></div>
                            <div class="corner br"></div>
                            <div class="rec-indicator"></div>
                        </div>

                        <div class="tv-glare"></div>
                        <div class="tv-static"></div>
                        
                        <img class="tv-image" src="" alt="Work preview" />
                        
                        <div class="text-overlay">
                            <p class="content-heading" data-outtakes="https://media.giphy.com/media/3o6ozvv0zsJskzOCbu/giphy.gif"></p>
                        </div>

                        <div class="smpte-bars"></div>
                        <div class="easter-egg-osd">
                            <p class="osd-title">DIAGNOSTIC MODE</p>
                            <p class="osd-code">CODE: <span>DIRECTOR5</span></p>
                            <p class="osd-discount">5% OFF YOUR NEXT PROJECT</p>
                        </div>
                    </div>

                    <div class="control-panel">
                        <button class="silver-power-btn" aria-label="Interactive Hardware Button"></button>
                    </div>
                </div>

                <div class="rig-handle right-handle">
                    <div class="handle-arm"></div>
                    <div class="handle-grip"></div>
                </div>
            </div>
        </div>
    </main>
  );
}
