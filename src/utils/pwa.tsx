import { registerSW } from "virtual:pwa-register";
import { toast } from "react-toastify";
import { t } from "i18next";
import { Button, Flex } from "@radix-ui/themes";

const refresh = registerSW({
	onOfflineReady() {
		toast.info(
			t(
				"pwa.offlineReady",
				"Site cached for offline use. You can now use it without Internet.",
			),
		);
	},
	onNeedRefresh() {
		toast.info(
			<Flex direction="column" gap="2" align="stretch">
				<div>
					{t(
						"pwa.updateRefresh",
						"Update available. Refresh to load the latest version!",
					)}
				</div>
				<Button
					size="2"
					onClick={() => {
						refresh(true);
					}}
				>
					{t("pwa.refresh", "Refresh")}
				</Button>
			</Flex>,
		);
	},
});
