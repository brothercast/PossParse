{ pkgs, ... }: {
  # ---------------------------------------------------------------------------
  # Project IDX Workspace Configuration for SSPEC PossPath Flask App (Python 3.13.2)
  # ---------------------------------------------------------------------------

  # --- 1. Nixpkgs Channel ---
  channel = "stable-23.11";

  # --- 2. System Packages ---
  packages = [
    pkgs.nodejs_20      # Node.js
    pkgs.python313     # Python 3.13.2 (Updated)
    pkgs.python313Packages.pip  # pip for Python 3.13
    pkgs.postgresql    # PostgreSQL
    pkgs.redis          # Redis
    pkgs.docker         # Docker
    pkgs.httpie
    pkgs.vim
  ];

  # --- 3. Environment Variables ---
  env = {
    NODE_ENV = "development";
    GOOGLE_GEMINI_API_KEY = "YOUR_GOOGLE_GEMINI_API_KEY_HERE";
    SQLALCHEMY_DATABASE_URI = "postgresql://user:password@localhost:5432/your_database_name";
    REDIS_URL = "redis://localhost:6379";
  };

  # --- 4. IDE Extensions ---
  idx.extensions = [
    "ms-python.python"
    "dbaeumer.vscode-eslint"
    "esbenp.prettier-vscode"
    "EditorConfig.EditorConfig"
    "ms-azuretools.vscode-docker"
  ];

  # --- 5. App Previews ---
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [
          "python3"      # Using python3 - likely sufficient
          "app.py"
        ];
        manager = "web";
      };
    };
  };

  # --- 6. Services ---
  services = {
    postgres = {
      enable = true;
    };
    redis = {
      enable = true;
    };
    docker = {
      enable = true;
    };
  };

  # --- 7. Workspace Lifecycle Commands ---
  idx.workspace = {
    onCreate = {
      npm-install = "pip install -r requirements.txt";
      default.openFiles = [ "app.py" ];
    };
    onStart = {
      default.openFiles = [ "routes.py" ];
    };
  };
}