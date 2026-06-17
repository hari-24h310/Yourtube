export const startCall = async (req, res) => {
    try {
        // Logic to initiate a call
        res.status(200).json({ message: "Call initiated successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};