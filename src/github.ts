import axios from "axios";

export interface Release {
  releaseId: number;
  downloadUrl: string;
}

interface GithubAsset {
  name: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  browser_download_url: string;
}

interface GithubRelease {
  id: number;
  assets: GithubAsset[];
}

export async function getLatestReleaseAsset(
  repository: string,
  assetName: string,
): Promise<Release> {
  const response = await axios.get<GithubRelease>(
    `https://api.github.com/repos/${repository}/releases/latest`,
  );
  const release = response.data;
  const downloadUrl =
    release.assets.find((asset) => asset.name === assetName)
      ?.browser_download_url ?? "";
  return {
    releaseId: release.id,
    downloadUrl,
  };
}
